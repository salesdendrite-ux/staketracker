const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log('Running migrations...');
  for (const file of files) {
    if (!file.endsWith('.sql')) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`  Running ${file}...`);
    await pool.query(sql);
    console.log(`  ✓ ${file}`);
  }
  console.log('All migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
