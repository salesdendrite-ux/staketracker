CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  reports_to UUID REFERENCES stakeholders(id) ON DELETE SET NULL,
  reports_to_name VARCHAR(255),
  linkedin_url TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  marked_inactive_at TIMESTAMPTZ,
  consecutive_misses INTEGER DEFAULT 0
);
