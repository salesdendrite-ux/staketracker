require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─── Middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('short'));

// ─── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/companies/:companyId/stakeholders', require('./routes/stakeholders'));
app.use('/api/companies/:companyId/changelog', require('./routes/changelog'));
app.use('/api/companies/:companyId/scrape', require('./routes/scrape'));
app.use('/api/companies/:companyId/scrape-jobs', (req, res, next) => {
  // Rewrite to use the scrape route's /jobs handler
  req.url = '/jobs' + (req.url === '/' ? '' : req.url);
  req.params = req.params || {};
  req.params.companyId = req.params.companyId || req.path.split('/')[3];
  require('./routes/scrape')(req, res, next);
});
app.use('/api/companies/:companyId/export', require('./routes/export'));
app.use('/api/changelog', require('./routes/globalChangelog'));
app.use('/api/export', require('./routes/globalExport'));

// Scrape job detail route
const { authenticate } = require('./middleware/auth');
const pool = require('./db/pool');
app.get('/api/scrape-jobs/:jobId', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scrape_jobs WHERE id = $1', [req.params.jobId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// ─── Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve frontend in production ──────────────────────────────────
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // All non-API routes serve the React app
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

// ─── Error handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Auto-migrate + Start server ───────────────────────────────────
async function start() {
  // Run migrations automatically on startup
  const fs = require('fs');
  const pool = require('./db/pool');
  const migrationsDir = path.join(__dirname, 'db/migrations');

  try {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    logger.info(`Running ${files.length} migrations...`);
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
    }
    logger.info('Migrations complete');
  } catch (err) {
    logger.error('Migration failed:', { error: err.message });
    // Don't exit — migrations are idempotent, tables may already exist
  }

  app.listen(PORT, () => {
    logger.info(`StakeTracker running on port ${PORT} (${isProd ? 'production' : 'development'})`);
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  });
}

start();

module.exports = app;
