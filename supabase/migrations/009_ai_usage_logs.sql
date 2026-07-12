-- AI usage logs — one row per completed workflow run.
-- Covers: deal underwriting (aggregated across all 4 Claude calls),
--         live call scoring, and training call scoring.

CREATE TABLE public.ai_usage_logs (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid           NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  app           text           NOT NULL CHECK (app IN ('underwriting', 'sales_coach', 'training_coach')),
  entity_id     uuid           NOT NULL,  -- deal_id | live_call_id | training_call_id
  entity_type   text           NOT NULL CHECK (entity_type IN ('deal', 'live_call', 'training_call')),
  input_tokens  integer        NOT NULL DEFAULT 0,
  output_tokens integer        NOT NULL DEFAULT 0,
  cost_usd      numeric(12,6)  NOT NULL DEFAULT 0,
  model         text           NOT NULL,
  created_at    timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_logs: super_admin full access"
  ON public.ai_usage_logs FOR ALL TO authenticated
  USING  (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "ai_usage_logs: admin read own company"
  ON public.ai_usage_logs FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_access_role() IN ('admin', 'super_admin')
  );

GRANT SELECT ON public.ai_usage_logs TO authenticated;

CREATE INDEX ai_usage_logs_company_created ON public.ai_usage_logs (company_id, created_at DESC);
