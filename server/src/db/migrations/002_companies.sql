CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  linkedin_url TEXT,
  org_url TEXT,
  scrape_frequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
  scrape_enabled BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  next_scrape_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
