CREATE INDEX IF NOT EXISTS idx_stakeholders_company_status ON stakeholders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_stakeholders_linkedin_url ON stakeholders(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_change_log_company_detected ON change_log(company_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_stakeholder_detected ON change_log(stakeholder_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_company_status ON scrape_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_companies_next_scrape ON companies(next_scrape_at) WHERE scrape_enabled = true;
