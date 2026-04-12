const express = require('express');
const { authenticate } = require('../middleware/auth');
const { exportAll } = require('../services/exporter');

const router = express.Router();

// GET /api/export/all
router.get('/all', authenticate, async (req, res) => {
  try {
    const { buffer, filename } = await exportAll();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export all error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

module.exports = router;
