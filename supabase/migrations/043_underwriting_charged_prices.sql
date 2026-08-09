-- Add per-API charged price columns to billing_config for underwriting.
-- These replace the single multiplier for underwriting: superadmin sets
-- exactly what gets deducted per API per deal instead of (cost × multiplier).

ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS rentcast_charged_usd        numeric(10,6) DEFAULT 0.074000,
  ADD COLUMN IF NOT EXISTS axesso_charged_usd           numeric(10,6) DEFAULT 0.020000,
  ADD COLUMN IF NOT EXISTS claude_input_charged_per_m  numeric(10,4) DEFAULT 5.0000,
  ADD COLUMN IF NOT EXISTS claude_output_charged_per_m numeric(10,4) DEFAULT 25.0000;

-- Seed the global underwriting row with sensible defaults (no markup — actual cost)
UPDATE public.billing_config
  SET rentcast_charged_usd        = 0.074000,
      axesso_charged_usd           = 0.020000,
      claude_input_charged_per_m  = 5.0000,
      claude_output_charged_per_m = 25.0000
  WHERE app = 'underwriting' AND company_id IS NULL;
