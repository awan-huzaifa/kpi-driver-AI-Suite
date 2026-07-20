ALTER TABLE data_enrichment_logs ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE data_enrichment_logs ADD COLUMN IF NOT EXISTS crm_link text;
ALTER TABLE data_enrichment_logs ADD COLUMN IF NOT EXISTS lead_source text;
