-- Seed sales_coach global billing_config row with Sonnet 4.6 reference rates.
-- claude_input_charged_per_m / claude_output_charged_per_m columns already exist
-- from migration 043 (defaulted to 5/25 — correct them to Sonnet rates).

UPDATE public.billing_config
  SET claude_input_charged_per_m  = 3.0000,
      claude_output_charged_per_m = 15.0000
  WHERE app = 'sales_coach' AND company_id IS NULL;
