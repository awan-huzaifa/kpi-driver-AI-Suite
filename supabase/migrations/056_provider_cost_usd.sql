-- Track original provider cost alongside the billed amount on each run.
-- This enables profit = billed - cost reporting for super admins.

-- 1. ai_usage_logs: add provider_cost_usd (what Anthropic/Whisper/etc actually charged us)
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS provider_cost_usd numeric(12,6) DEFAULT NULL;

-- 2. skip_tracing_logs: add provider_cost_usd (Tracerfy actual rate)
ALTER TABLE public.skip_tracing_logs
  ADD COLUMN IF NOT EXISTS provider_cost_usd numeric(12,6) DEFAULT NULL;

-- 3. billing_config: add de_cost_per_call_usd for data enrichment provider rate (Axesso)
ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS de_cost_per_call_usd numeric(10,6) DEFAULT 0.001800;

UPDATE public.billing_config
   SET de_cost_per_call_usd = 0.001800
 WHERE app = 'data_enrichment' AND company_id IS NULL;

-- 4. Function: aggregate billed / cost / profit per company across all apps.
--    Called by the super-admin companies page to fill the three new columns.
CREATE OR REPLACE FUNCTION get_all_companies_profit_summary()
RETURNS TABLE (
  company_id   uuid,
  total_billed numeric,
  total_cost   numeric,
  profit       numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    company_id,
    SUM(billed)::numeric            AS total_billed,
    SUM(cost)::numeric              AS total_cost,
    (SUM(billed) - SUM(cost))::numeric AS profit
  FROM (
    SELECT company_id,
           COALESCE(cost_usd, 0)          AS billed,
           COALESCE(provider_cost_usd, 0) AS cost
    FROM ai_usage_logs

    UNION ALL

    SELECT company_id,
           COALESCE(cost_usd, 0)          AS billed,
           COALESCE(provider_cost_usd, 0) AS cost
    FROM skip_tracing_logs
    WHERE company_id IS NOT NULL
  ) combined
  GROUP BY company_id
$$;
