ALTER TABLE skip_tracing_logs ADD COLUMN IF NOT EXISTS lead_source text;
ALTER TABLE skip_tracing_logs ADD COLUMN IF NOT EXISTS contact_name text;
