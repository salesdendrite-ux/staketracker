CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  change_type VARCHAR(30) NOT NULL,
  field_name VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
