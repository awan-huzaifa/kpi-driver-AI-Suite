-- Add per-flow-type charged prices for skip tracing.
-- Each flow type has its own editable charged price (what companies are billed per hit).

ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS st_charged_normal_usd   numeric(10,6) DEFAULT 0.020000,
  ADD COLUMN IF NOT EXISTS st_charged_advanced_usd numeric(10,6) DEFAULT 0.040000,
  ADD COLUMN IF NOT EXISTS st_charged_apn_usd      numeric(10,6) DEFAULT 0.100000,
  ADD COLUMN IF NOT EXISTS st_charged_dnc_usd      numeric(10,6) DEFAULT 0.020000;

UPDATE public.billing_config
  SET st_charged_normal_usd   = 0.020000,
      st_charged_advanced_usd = 0.040000,
      st_charged_apn_usd      = 0.100000,
      st_charged_dnc_usd      = 0.020000
  WHERE app = 'skip_tracing' AND company_id IS NULL;
