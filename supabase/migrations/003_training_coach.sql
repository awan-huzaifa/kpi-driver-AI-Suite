-- ============================================================
-- TRAINING COACH
-- Run manually in the Supabase SQL Editor.
-- Adds AI-agent registry + columns needed to ingest Assistable AI
-- post-call webhooks directly (location_id / from / to mapping).
-- ============================================================

CREATE TABLE public.training_ai_agents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  phone_number text        NOT NULL,
  agent_name   text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_ai_agents
  ADD CONSTRAINT training_ai_agents_phone_unique UNIQUE (phone_number);

ALTER TABLE public.training_calls
  ADD COLUMN ai_agent_id      uuid REFERENCES public.training_ai_agents (id) ON DELETE SET NULL,
  ADD COLUMN external_call_id text,
  ADD COLUMN call_summary     text;

-- Dedupe webhook retries from Assistable (same call_id delivered twice)
ALTER TABLE public.training_calls
  ADD CONSTRAINT training_calls_external_call_id_unique UNIQUE (external_call_id);

ALTER TABLE public.training_ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_ai_agents: company members view own"
  ON public.training_ai_agents FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    OR public.get_my_access_role() = 'super_admin'
  );

CREATE POLICY "training_ai_agents: admins manage own company"
  ON public.training_ai_agents FOR ALL TO authenticated
  USING (
    (company_id = public.get_my_company_id() AND public.get_my_access_role() IN ('admin', 'super_admin'))
    OR public.get_my_access_role() = 'super_admin'
  )
  WITH CHECK (
    (company_id = public.get_my_company_id() AND public.get_my_access_role() IN ('admin', 'super_admin'))
    OR public.get_my_access_role() = 'super_admin'
  );

GRANT SELECT ON public.training_ai_agents TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.training_ai_agents TO authenticated;
