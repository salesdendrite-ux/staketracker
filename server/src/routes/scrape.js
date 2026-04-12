const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { processQueue } = require('../services/scheduler');

const router = express.Router({ mergeParams: true });

// POST /api/companies/:companyId/scrape — trigger manual scrape
router.post('/', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;

    // Check company exists
    const company = await pool.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if there's already a pending/running job
    const activeJob = await pool.query(
      "SELECT id FROM scrape_jobs WHERE company_id = $1 AND status IN ('pending', 'running')",
      [companyId]
    );
    if (activeJob.rows.length > 0) {
      return res.status(409).json({ error: 'A scrape job is already in progress for this company' });
    }

    // Create the job
    const result = await pool.query(
      `INSERT INTO scrape_jobs (company_id, status, triggered_by)
       VALUES ($1, 'pending', 'manual')
       RETURNING *`,
      [companyId]
    );

    // Kick off queue processing (non-blocking)
    setImmediate(() => processQueue());

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Trigger scrape error:', err);
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

// GET /api/companies/:companyId/scrape-jobs
router.get('/jobs', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(
      `SELECT * FROM scrape_jobs
       WHERE company_id = $1
       ORDER BY started_at DESC NULLS LAST, created_at DESC
       LIMIT 20`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List scrape jobs error:', err);
    res.status(500).json({ error: 'Failed to list scrape jobs' });
  }
});

// GET /api/scrape-jobs/:jobId
router.get('/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await pool.query('SELECT * FROM scrape_jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get scrape job error:', err);
    res.status(500).json({ error: 'Failed to get scrape job' });
  }
});

module.exports = router;
