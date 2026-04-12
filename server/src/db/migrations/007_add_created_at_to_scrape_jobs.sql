DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scrape_jobs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE scrape_jobs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
