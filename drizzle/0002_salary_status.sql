ALTER TABLE data.salary_entries
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

CREATE INDEX IF NOT EXISTS salary_status_idx
  ON data.salary_entries (status);
