const express = require('express');
const { body } = require('express-validator');
const pool = require('../db/pool');
const { validate } = require('../middleware/validate');
const { authenticate, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/companies
router.get('/', authenticate, async (req, res) => {
  try {
    const search = req.query.search || '';
    let sql = `
      SELECT c.*,
        COUNT(s.id) FILTER (WHERE s.status != 'inactive') AS stakeholder_count,
        COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_count,
        COUNT(s.id) FILTER (WHERE s.status = 'new') AS new_count,
        COUNT(s.id) FILTER (WHERE s.status = 'inactive') AS inactive_count
      FROM companies c
      LEFT JOIN stakeholders s ON s.company_id = c.id
      WHERE c.is_archived = false
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND c.name ILIKE $${params.length}`;
    }
    sql += ' GROUP BY c.id ORDER BY c.created_at DESC';
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('List companies error:', { error: err.message });
    res.status(500).json({ error: 'Failed to list companies' });
  }
});

// POST /api/companies — FIX-05: URL validation
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('linkedin_url').optional({ nullable: true })
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('Must be a valid HTTPS URL'),
    body('org_url').optional({ nullable: true })
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('Must be a valid HTTPS URL'),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, linkedin_url, org_url, scrape_frequency } = req.body;
      const freq = scrape_frequency || 'weekly';
      const FREQ_MS = { daily: 86400000, weekly: 604800000, biweekly: 1209600000, monthly: 2592000000 };
      const nextScrape = new Date(Date.now() + (FREQ_MS[freq] || FREQ_MS.weekly));

      const result = await pool.query(
        `INSERT INTO companies (name, linkedin_url, org_url, scrape_frequency, created_by, next_scrape_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, linkedin_url || null, org_url || null, freq, req.user.userId, nextScrape]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Create company error:', { error: err.message });
      res.status(500).json({ error: 'Failed to create company' });
    }
  }
);

// GET /api/companies/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const companyResult = await pool.query('SELECT * FROM companies WHERE id = $1 AND is_archived = false', [id]);
    if (companyResult.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const statsResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'active') AS active_count,
        COUNT(*) FILTER (WHERE status = 'new') AS new_count,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_count,
        COUNT(*) AS total_count
       FROM stakeholders WHERE company_id = $1`, [id]);

    const recentChanges = await pool.query(
      `SELECT COUNT(*) AS count FROM change_log
       WHERE company_id = $1 AND detected_at > NOW() - INTERVAL '30 days'`, [id]);

    res.json({
      ...companyResult.rows[0],
      stats: statsResult.rows[0],
      recent_changes_count: parseInt(recentChanges.rows[0].count),
    });
  } catch (err) {
    logger.error('Get company error:', { error: err.message });
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// PUT /api/companies/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, linkedin_url, org_url, scrape_frequency, scrape_enabled } = req.body;
    const existing = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

    const result = await pool.query(
      `UPDATE companies SET
        name = COALESCE($1, name), linkedin_url = COALESCE($2, linkedin_url),
        org_url = COALESCE($3, org_url), scrape_frequency = COALESCE($4, scrape_frequency),
        scrape_enabled = COALESCE($5, scrape_enabled)
       WHERE id = $6 RETURNING *`,
      [name, linkedin_url, org_url, scrape_frequency, scrape_enabled, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Update company error:', { error: err.message });
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// DELETE /api/companies/:id — FIX-02: Soft delete (archive), not hard delete
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE companies SET is_archived = true WHERE id = $1 AND is_archived = false RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company archived' });
  } catch (err) {
    logger.error('Archive company error:', { error: err.message });
    res.status(500).json({ error: 'Failed to archive company' });
  }
});

module.exports = router;
