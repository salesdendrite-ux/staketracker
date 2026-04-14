const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { processQueue } = require('../services/scheduler');
const logger = require('../utils/logger');

// FIX-10: Clean routing with mergeParams, no URL rewriting
const router = express.Router({ mergeParams: true });

// POST /api/companies/:companyId/scrape — trigger manual scrape
router.post('/', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await pool.query('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const activeJob = await pool.query(
      "SELECT id FROM scrape_jobs WHERE company_id = $1 AND status IN ('pending', 'running')", [companyId]);
    if (activeJob.rows.length > 0) {
      return res.status(409).json({ error: 'A scrape job is already in progress for this company' });
    }

    const result = await pool.query(
      `INSERT INTO scrape_jobs (company_id, status, triggered_by) VALUES ($1, 'pending', 'manual') RETURNING *`, [companyId]);
    setImmediate(() => processQueue());
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Trigger scrape error:', { error: err.message });
    res.status(500).json({ error: 'Failed to trigger scrape' });
  }
});

// GET /api/companies/:companyId/scrape/jobs — list scrape jobs
router.get('/jobs', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await pool.query(
      `SELECT * FROM scrape_jobs WHERE company_id = $1
       ORDER BY started_at DESC NULLS LAST, created_at DESC LIMIT 20`, [companyId]);
    res.json(result.rows);
  } catch (err) {
    logger.error('List scrape jobs error:', { error: err.message });
    res.status(500).json({ error: 'Failed to list scrape jobs' });
  }
});

// GET /api/companies/:companyId/scrape/jobs/:jobId — job detail
router.get('/jobs/:jobId', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await pool.query('SELECT * FROM scrape_jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Get scrape job error:', { error: err.message });
    res.status(500).json({ error: 'Failed to get scrape job' });
  }
});

module.exports = router;
