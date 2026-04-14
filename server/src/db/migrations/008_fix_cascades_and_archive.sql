-- FIX-02: Remove CASCADE on change_log FKs, add soft-delete for companies
ALTER TABLE change_log DROP CONSTRAINT IF EXISTS change_log_stakeholder_id_fkey;
ALTER TABLE change_log ADD FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE SET NULL;

ALTER TABLE change_log DROP CONSTRAINT IF EXISTS change_log_company_id_fkey;
ALTER TABLE change_log ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
