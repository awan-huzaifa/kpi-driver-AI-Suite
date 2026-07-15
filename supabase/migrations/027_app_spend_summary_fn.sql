-- Aggregate per-app AI spend + cost_breakdown sums for the billing App Usage card.
-- Both total and breakdown come from ai_usage_logs so they always add up correctly.
-- Skip Tracing (no ai_usage_logs entries) is handled separately via company_wallet_transactions.

CREATE OR REPLACE FUNCTION get_company_app_spend(p_company_id uuid)
RETURNS TABLE (
  app                  text,
  total_cost           numeric,
  run_count            bigint,
  total_input_tokens   bigint,
  total_output_tokens  bigint,
  ai_cost              numeric,
  transcription_cost   numeric,
  property_api_1_cost  numeric,
  property_api_2_cost  numeric,
  voice_agent_cost     numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- AI-logged apps: total and breakdown both from ai_usage_logs (always consistent)
  SELECT
    app,
    COALESCE(SUM(cost_usd), 0)::numeric                                    AS total_cost,
    COUNT(*)::bigint                                                        AS run_count,
    COALESCE(SUM(input_tokens),  0)::bigint                                AS total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::bigint                                AS total_output_tokens,
    COALESCE(SUM((cost_breakdown->>'ai')::numeric),            0)::numeric AS ai_cost,
    COALESCE(SUM((cost_breakdown->>'transcription')::numeric), 0)::numeric AS transcription_cost,
    COALESCE(SUM((cost_breakdown->>'property_api_1')::numeric),0)::numeric AS property_api_1_cost,
    COALESCE(SUM((cost_breakdown->>'property_api_2')::numeric),0)::numeric AS property_api_2_cost,
    COALESCE(SUM((cost_breakdown->>'voice_agent')::numeric),   0)::numeric AS voice_agent_cost
  FROM ai_usage_logs
  WHERE company_id = p_company_id
  GROUP BY app

  UNION ALL

  -- Skip Tracing: no ai_usage_logs rows, pull from wallet transactions only
  SELECT
    'skip_tracing'::text AS app,
    COALESCE(SUM(amount_usd), 0)::numeric AS total_cost,
    COUNT(*)::bigint                       AS run_count,
    0::bigint AS total_input_tokens,
    0::bigint AS total_output_tokens,
    0::numeric AS ai_cost,
    0::numeric AS transcription_cost,
    0::numeric AS property_api_1_cost,
    0::numeric AS property_api_2_cost,
    0::numeric AS voice_agent_cost
  FROM company_wallet_transactions
  WHERE company_id = p_company_id
    AND type       = 'deduction'
    AND app        = 'skip_tracing'
  HAVING COUNT(*) > 0
$$;
