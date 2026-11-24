-- 063_usage_summary_rpc.sql
-- Server-side aggregate for billing stat cards so the page never hits the
-- PostgREST row limit (default 1000) when summing all-time usage.

CREATE OR REPLACE FUNCTION get_company_usage_summary(p_company_id uuid)
RETURNS TABLE (
  total_cost        numeric,
  total_runs        bigint,
  total_input_tokens bigint,
  total_output_tokens bigint,
  skip_tracing_cost numeric,
  skip_tracing_runs bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(cost_usd), 0)::numeric          AS total_cost,
    COUNT(*)::bigint                              AS total_runs,
    COALESCE(SUM(input_tokens), 0)::bigint        AS total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::bigint       AS total_output_tokens,
    0::numeric                                    AS skip_tracing_cost,
    0::bigint                                     AS skip_tracing_runs
  FROM ai_usage_logs
  WHERE company_id = p_company_id

  UNION ALL

  SELECT
    0::numeric,
    0::bigint,
    0::bigint,
    0::bigint,
    COALESCE(SUM(amount_usd), 0)::numeric         AS skip_tracing_cost,
    COUNT(*)::bigint                              AS skip_tracing_runs
  FROM company_wallet_transactions
  WHERE company_id = p_company_id
    AND app = 'skip_tracing'
    AND type = 'deduction'
$$;

GRANT EXECUTE ON FUNCTION get_company_usage_summary(uuid) TO authenticated;
