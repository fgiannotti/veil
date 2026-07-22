ALTER TABLE data.salary_entries
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS data.benefit_tags (
  slug text PRIMARY KEY,
  label text NOT NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS benefit_tags_use_count_idx
  ON data.benefit_tags (use_count DESC);
