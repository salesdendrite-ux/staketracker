const express = require('express');
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { PAGINATION_DEFAULT_LIMIT } = require('../utils/constants');

const router = express.Router({ mergeParams: true });

// GET /api/companies/:companyId/changelog
router.get('/', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { change_type, from, to, page = 1, limit = PAGINATION_DEFAULT_LIMIT } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT cl.*,
        s.full_name AS stakeholder_name,
        c.name AS company_name
      FROM change_log cl
      JOIN stakeholders s ON cl.stakeholder_id = s.id
      JOIN companies c ON cl.company_id = c.id
      WHERE cl.company_id = $1
    `;
    const params = [companyId];

    if (change_type) {
      params.push(change_type);
      sql += ` AND cl.change_type = $${params.length}`;
    }
    if (from) {
      params.push(from);
      sql += ` AND cl.detected_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND cl.detected_at <= $${params.length}`;
    }

    // Get total count
    const countSql = sql.replace(/SELECT cl\.\*,[\s\S]*?FROM/, 'SELECT COUNT(*) AS total FROM');
    const countResult = await pool.query(countSql, params);
    const total = parseInt(countResult.rows[0].total);

    sql += ` ORDER BY cl.detected_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(sql, params);
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get changelog error:', err);
    res.status(500).json({ error: 'Failed to get changelog' });
  }
});

module.exports = router;
