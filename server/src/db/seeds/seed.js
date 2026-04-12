const pool = require('../pool');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['admin@staketracker.com', passwordHash, 'Admin User', 'admin']
  );
  const userId = userResult.rows[0].id;

  // Create test companies
  const companies = [
    { name: 'Acme Corp', linkedin_url: 'https://linkedin.com/company/acme', org_url: 'https://theorg.com/org/acme' },
    { name: 'Globex Inc', linkedin_url: 'https://linkedin.com/company/globex', org_url: null },
    { name: 'Initech', linkedin_url: null, org_url: 'https://theorg.com/org/initech' },
  ];

  for (const co of companies) {
    const companyResult = await pool.query(
      `INSERT INTO companies (name, linkedin_url, org_url, created_by, next_scrape_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [co.name, co.linkedin_url, co.org_url, userId]
    );

    if (companyResult.rows.length === 0) continue;
    const companyId = companyResult.rows[0].id;

    // Add stakeholders
    const stakeholders = [
      { full_name: 'John Smith', title: 'CEO', status: 'active', linkedin_url: 'https://linkedin.com/in/johnsmith' },
      { full_name: 'Jane Doe', title: 'CTO', status: 'active', linkedin_url: 'https://linkedin.com/in/janedoe' },
      { full_name: 'Bob Wilson', title: 'VP Engineering', status: 'new', linkedin_url: 'https://linkedin.com/in/bobwilson' },
      { full_name: 'Alice Chen', title: 'VP Sales', status: 'inactive', linkedin_url: null },
    ];

    for (const s of stakeholders) {
      const sResult = await pool.query(
        `INSERT INTO stakeholders (company_id, full_name, title, status, source, linkedin_url, first_seen_at, last_seen_at, marked_inactive_at)
         VALUES ($1, $2, $3, $4, 'manual', $5, NOW() - INTERVAL '30 days', NOW(), $6)
         RETURNING id`,
        [companyId, s.full_name, s.title, s.status, s.linkedin_url, s.status === 'inactive' ? new Date() : null]
      );
      const stakeholderId = sResult.rows[0].id;

      // Add change log entries
      await pool.query(
        `INSERT INTO change_log (stakeholder_id, company_id, change_type, detected_at)
         VALUES ($1, $2, 'new_stakeholder', NOW() - INTERVAL '30 days')`,
        [stakeholderId, companyId]
      );
    }
  }

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
