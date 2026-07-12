-- ── 014_enrichment_contact_name.sql ──────────────────────────────
-- Adds contact_name column to data_enrichment_logs

ALTER TABLE data_enrichment_logs
  ADD COLUMN IF NOT EXISTS contact_name text;
