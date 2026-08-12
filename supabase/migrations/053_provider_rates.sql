-- Make all provider rates DB-stored and editable in billing config UI.
-- Adds cost columns (reference cost from API vendor) alongside existing charged columns.

ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS claude_input_cost_per_m   numeric(10,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS claude_output_cost_per_m  numeric(10,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assistable_cost_per_min   numeric(10,4) DEFAULT 0.0700,
  ADD COLUMN IF NOT EXISTS nt_whisper_cost_per_min   numeric(10,6) DEFAULT 0.006000,
  ADD COLUMN IF NOT EXISTS nt_gpt_input_cost_per_m   numeric(10,4) DEFAULT 0.7500,
  ADD COLUMN IF NOT EXISTS nt_gpt_output_cost_per_m  numeric(10,4) DEFAULT 4.5000,
  ADD COLUMN IF NOT EXISTS st_normal_rate_usd        numeric(10,6) DEFAULT 0.020000,
  ADD COLUMN IF NOT EXISTS st_advanced_rate_usd      numeric(10,6) DEFAULT 0.040000,
  ADD COLUMN IF NOT EXISTS st_apn_rate_usd           numeric(10,6) DEFAULT 0.100000,
  ADD COLUMN IF NOT EXISTS st_dnc_rate_usd           numeric(10,6) DEFAULT 0.020000;

-- Underwriting uses Claude Opus
UPDATE public.billing_config
   SET claude_input_cost_per_m  = 5.0000,
       claude_output_cost_per_m = 25.0000
 WHERE app = 'underwriting' AND company_id IS NULL;

-- Sales Coach and Training Coach use Claude Sonnet 4.6
UPDATE public.billing_config
   SET claude_input_cost_per_m  = 3.0000,
       claude_output_cost_per_m = 15.0000
 WHERE app IN ('sales_coach', 'training_coach') AND company_id IS NULL;

-- Training Coach Assistable AI voice rate → $0.07/min
UPDATE public.billing_config
   SET assistable_cost_per_min = 0.0700
 WHERE app = 'training_coach' AND company_id IS NULL;

-- Note Taker provider rates
UPDATE public.billing_config
   SET nt_whisper_cost_per_min  = 0.006000,
       nt_gpt_input_cost_per_m  = 0.7500,
       nt_gpt_output_cost_per_m = 4.5000
 WHERE app = 'note_taker' AND company_id IS NULL;

-- Skip Tracing Tracerfy provider rates
UPDATE public.billing_config
   SET st_normal_rate_usd   = 0.020000,
       st_advanced_rate_usd = 0.040000,
       st_apn_rate_usd      = 0.100000,
       st_dnc_rate_usd      = 0.020000
 WHERE app = 'skip_tracing' AND company_id IS NULL;
