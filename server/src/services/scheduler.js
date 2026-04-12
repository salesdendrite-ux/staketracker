const cron = require('node-cron');
const pool = require('../db/pool');
const { scrapeCompany } = require('./scraper');
const { runDiffEngine } = require('./diffEngine');
const { SCRAPE_FREQUENCIES, JOB_STATUSES } = require('../utils/constants');
const logger = require('../utils/logger');

let isProcessing = false;

/**
 * Process a single scrape job
 */
async function processJob(job) {
  const { id: jobId, company_id } = job;

  try {
    // Mark job as running
    await pool.query(
      "UPDATE scrape_jobs SET status = $1, started_at = NOW() WHERE id = $2",
      [JOB_STATUSES.RUNNING, jobId]
    );

    // Get company details
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1', [company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const company = companyResult.rows[0];

    // Run scraper
    logger.info(`Starting scrape for ${company.name}`, { jobId });
    const scrapedPeople = await scrapeCompany(company);

    // Run diff engine
    const summary = await runDiffEngine(company_id, scrapedPeople);

    // Update job as completed
    await pool.query(
      `UPDATE scrape_jobs SET
        status = $1, completed_at = NOW(),
        stakeholders_found = $2, changes_detected = $3
       WHERE id = $4`,
      [
        JOB_STATUSES.COMPLETED,
        scrapedPeople.length,
        summary.new_count + summary.updated_count + summary.departed_count + summary.returned_count,
        jobId,
      ]
    );

    // Update company last_scraped_at and compute next_scrape_at
    const freqMs = SCRAPE_FREQUENCIES[company.scrape_frequency] || SCRAPE_FREQUENCIES.weekly;
    await pool.query(
      `UPDATE companies SET
        last_scraped_at = NOW(),
        next_scrape_at = NOW() + INTERVAL '${Math.floor(freqMs / 1000)} seconds'
       WHERE id = $1`,
      [company_id]
    );

    logger.info(`Scrape completed for ${company.name}`, { jobId, summary });
    return summary;
  } catch (err) {
    // Mark job as failed
    await pool.query(
      "UPDATE scrape_jobs SET status = $1, completed_at = NOW(), error_message = $2 WHERE id = $3",
      [JOB_STATUSES.FAILED, err.message, jobId]
    );
    logger.error(`Scrape failed for job ${jobId}: ${err.message}`);
    throw err;
  }
}

/**
 * Process pending jobs from the queue (serial — one at a time)
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const result = await pool.query(
      `SELECT * FROM scrape_jobs
       WHERE status = $1
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [JOB_STATUSES.PENDING]
    );

    if (result.rows.length === 0) {
      isProcessing = false;
      return;
    }

    await processJob(result.rows[0]);
  } catch (err) {
    logger.error('Queue processing error:', { error: err.message });
  } finally {
    isProcessing = false;
  }
}

/**
 * Check for companies due for scraping and create jobs
 */
async function checkScheduledScrapes() {
  try {
    const dueCompanies = await pool.query(
      `SELECT id FROM companies
       WHERE scrape_enabled = true
         AND next_scrape_at <= NOW()
         AND id NOT IN (
           SELECT company_id FROM scrape_jobs
           WHERE status IN ('pending', 'running')
         )`
    );

    for (const company of dueCompanies.rows) {
      await pool.query(
        `INSERT INTO scrape_jobs (company_id, status, triggered_by)
         VALUES ($1, 'pending', 'scheduled')`,
        [company.id]
      );
      logger.info(`Scheduled scrape job created for company ${company.id}`);
    }
  } catch (err) {
    logger.error('Scheduler check error:', { error: err.message });
  }
}

/**
 * Start the scheduler — polls every 60 seconds
 */
function startScheduler() {
  logger.info('Starting scrape scheduler (polling every 60s)');

  // Check for due scrapes every 60 seconds
  cron.schedule('* * * * *', async () => {
    await checkScheduledScrapes();
    await processQueue();
  });

  // Also process queue every 30 seconds to pick up manual triggers faster
  cron.schedule('*/30 * * * * *', async () => {
    await processQueue();
  });
}

module.exports = { startScheduler, processJob, processQueue };
