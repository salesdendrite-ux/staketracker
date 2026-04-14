const express = require('express');
const { body } = require('express-validator');
const pool = require('../db/pool');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router({ mergeParams: true });

// GET /api/companies/:companyId/stakeholders
// FIX-08: Status computed in SELECT via CASE, no UPDATE on every GET
router.get('/', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, search, sort, order } = req.query;

    let baseSql = `
      SELECT s.*,
        mgr.full_name AS resolved_reports_to_name,
        CASE
          WHEN s.status = 'new' AND s.first_seen_at < NOW() - make_interval(days => 90)
          THEN 'active'
          ELSE s.status
        END AS computed_status
      FROM stakeholders s
      LEFT JOIN stakeholders mgr ON s.reports_to = mgr.id
      WHERE s.company_id = $1
    `;
    const params = [companyId];

    if (search) {
      params.push(`%${search}%`);
      baseSql += ` AND (s.full_name ILIKE $${params.length} OR s.title ILIKE $${params.length})`;
    }

    // Wrap to filter on computed_status
    let sql = `SELECT sub.* FROM (${baseSql}) sub`;

    if (status) {
      params.push(status);
      sql += ` WHERE sub.computed_status = $${params.length}`;
    }

    const sortCol = { name: 'sub.full_name', title: 'sub.title', status: 'sub.computed_status' }[sort] || 'sub.full_name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${sortCol} ${sortOrder}`;

    const result = await pool.query(sql, params);
    const rows = result.rows.map(r => ({ ...r, status: r.computed_status || r.status }));
    res.json(rows);
  } catch (err) {
    logger.error('List stakeholders error:', { error: err.message });
    res.status(500).json({ error: 'Failed to list stakeholders' });
  }
});

// POST /api/companies/:companyId/stakeholders
router.post(
  '/',
  authenticate,
  [body('full_name').trim().notEmpty().withMessage('Full name is required')],
  validate,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const { full_name, title, linkedin_url, reports_to, email, phone } = req.body;

      // FIX-07: Duplicate detection
      const dup = await pool.query(
        `SELECT id, full_name FROM stakeholders
         WHERE company_id = $1 AND (
           ($2 IS NOT NULL AND linkedin_url = $2)
           OR LOWER(full_name) = LOWER($3)
         )`,
        [companyId, linkedin_url || null, full_name]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({
          error: 'Stakeholder with this name or LinkedIn URL already exists',
          existing: dup.rows[0],
        });
      }

      let reportsToName = null;
      if (reports_to) {
        const mgr = await pool.query('SELECT full_name FROM stakeholders WHERE id = $1', [reports_to]);
        if (mgr.rows.length > 0) reportsToName = mgr.rows[0].full_name;
      }

      const result = await pool.query(
        `INSERT INTO stakeholders (company_id, full_name, title, linkedin_url, reports_to, reports_to_name, email, phone, status, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', 'manual')
         RETURNING *`,
        [companyId, full_name, title || null, linkedin_url || null, reports_to || null, reportsToName, email || null, phone || null]
      );

      const stakeholder = result.rows[0];
      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type)
         VALUES ($1, $2, 'new_stakeholder')`,
        [stakeholder.id, companyId]
      );

      res.status(201).json(stakeholder);
    } catch (err) {
      logger.error('Create stakeholder error:', { error: err.message });
      res.status(500).json({ error: 'Failed to create stakeholder' });
    }
  }
);

// PUT /api/companies/:companyId/stakeholders/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { companyId, id } = req.params;
    const { full_name, title, linkedin_url, reports_to, email, phone } = req.body;

    const existing = await pool.query('SELECT * FROM stakeholders WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Stakeholder not found' });

    const old = existing.rows[0];
    let reportsToName = old.reports_to_name;
    if (reports_to !== undefined) {
      if (reports_to) {
        const mgr = await pool.query('SELECT full_name FROM stakeholders WHERE id = $1', [reports_to]);
        reportsToName = mgr.rows.length > 0 ? mgr.rows[0].full_name : null;
      } else {
        reportsToName = null;
      }
    }

    const result = await pool.query(
      `UPDATE stakeholders SET
        full_name = COALESCE($1, full_name), title = COALESCE($2, title),
        linkedin_url = COALESCE($3, linkedin_url), reports_to = $4, reports_to_name = $5,
        email = COALESCE($6, email), phone = COALESCE($7, phone), last_seen_at = NOW()
       WHERE id = $8 AND company_id = $9 RETURNING *`,
      [full_name || old.full_name, title !== undefined ? title : old.title,
       linkedin_url !== undefined ? linkedin_url : old.linkedin_url,
       reports_to !== undefined ? (reports_to || null) : old.reports_to, reportsToName,
       email !== undefined ? email : old.email, phone !== undefined ? phone : old.phone, id, companyId]
    );

    if (title !== undefined && title !== old.title) {
      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type, field_name, old_value, new_value)
         VALUES ($1, $2, 'title_change', 'title', $3, $4)`, [id, companyId, old.title, title]);
    }
    if (reports_to !== undefined && reports_to !== old.reports_to) {
      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type, field_name, old_value, new_value)
         VALUES ($1, $2, 'reports_to_change', 'reports_to', $3, $4)`, [id, companyId, old.reports_to_name, reportsToName]);
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Update stakeholder error:', { error: err.message });
    res.status(500).json({ error: 'Failed to update stakeholder' });
  }
});

// DELETE — soft delete (mark inactive)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { companyId, id } = req.params;
    const existing = await pool.query('SELECT * FROM stakeholders WHERE id = $1 AND company_id = $2', [id, companyId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Stakeholder not found' });

    await pool.query(`UPDATE stakeholders SET status = 'inactive', marked_inactive_at = NOW() WHERE id = $1`, [id]);
    await pool.query(`INSERT INTO change_log (stakeholder_id, company_id, change_type) VALUES ($1, $2, 'departed')`, [id, companyId]);
    res.json({ message: 'Stakeholder marked as inactive' });
  } catch (err) {
    logger.error('Delete stakeholder error:', { error: err.message });
    res.status(500).json({ error: 'Failed to remove stakeholder' });
  }
});

module.exports = router;
