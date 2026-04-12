const express = require('express');
const { authenticate } = require('../middleware/auth');
const { exportCompany, exportAll } = require('../services/exporter');

const router = express.Router({ mergeParams: true });

// GET /api/companies/:companyId/export
router.get('/', authenticate, async (req, res) => {
  try {
    const { companyId } = req.params;
    const { buffer, filename } = await exportCompany(companyId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export error:', err);
    if (err.message === 'Company not found') {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.status(500).json({ error: 'Failed to export' });
  }
});

module.exports = router;
