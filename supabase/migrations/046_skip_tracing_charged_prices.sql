-- Fix skip_tracing billing_config: credit_cost_usd is now the charged price per credit
-- (not raw cost × multiplier). Provider rate is $0.02/credit across all flow types.
-- Seed to $0.02 so existing rows start at cost price; super-admin sets the markup.

UPDATE public.billing_config
  SET credit_cost_usd = 0.0200
  WHERE app = 'skip_tracing' AND company_id IS NULL;
