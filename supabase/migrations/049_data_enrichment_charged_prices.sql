-- Add per-call charged price for Data Enrichment (Axesso API).
-- Provider rate: €15/10k calls ≈ $0.0016/call.

ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS de_charged_per_call_usd numeric(10,6) DEFAULT 0.001600;

UPDATE public.billing_config
  SET de_charged_per_call_usd = 0.001600
  WHERE app = 'data_enrichment' AND company_id IS NULL;
