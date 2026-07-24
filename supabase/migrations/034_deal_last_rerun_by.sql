-- Track who last re-ran a deal (NULL = never re-run)
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS last_rerun_by uuid REFERENCES users(id) ON DELETE SET NULL;
