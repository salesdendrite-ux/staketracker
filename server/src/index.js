require('dotenv').config();

// FIX-03: Validate required env vars at startup
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is required`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be >= 32 chars');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─── Middleware ─────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('short'));

// FIX-04: Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, try again later' },
});

// ─── Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/companies/:companyId/stakeholders', require('./routes/stakeholders'));
app.use('/api/companies/:companyId/changelog', require('./routes/changelog'));
// FIX-10: Clean route mounting — scrape.js handles all sub-routes with mergeParams
app.use('/api/companies/:companyId/scrape', require('./routes/scrape'));
app.use('/api/companies/:companyId/export', require('./routes/export'));
app.use('/api/changelog', require('./routes/globalChangelog'));
app.use('/api/export', require('./routes/globalExport'));

// FIX-11: Admin health endpoint
const { authenticate, requireAdmin } = require('./middleware/auth');
const pool = require('./db/pool');

app.get('/api/admin/health', authenticate, requireAdmin, async (req, res) => {
  try {
    const recent = await pool.query(
      `SELECT status, COUNT(*) AS count FROM scrape_jobs
       WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status`);
    const stuck = await pool.query(
      `SELECT COUNT(*) AS count FROM scrape_jobs
       WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'`);
    res.json({ jobs_24h: recent.rows, stuck_jobs: parseInt(stuck.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' });
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

// ─── Auto-migrate + Recover stuck jobs + Start ─────────────────────
async function start() {
  const fs = require('fs');
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
  }

  // FIX-11: Recover stuck jobs on startup
  try {
    const r = await pool.query(
      `UPDATE scrape_jobs SET status = 'failed', error_message = 'Server restart recovery', completed_at = NOW()
       WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'
       RETURNING id`);
    if (r.rows.length > 0) logger.warn(`Recovered ${r.rows.length} stuck scrape jobs`);
  } catch (err) {
    logger.error('Stuck job recovery failed:', { error: err.message });
  }

  app.listen(PORT, () => {
    logger.info(`StakeTracker running on port ${PORT} (${isProd ? 'production' : 'development'})`);
    const { startScheduler } = require('./services/scheduler');
    startScheduler();
  });
}

start();

module.exports = app;
