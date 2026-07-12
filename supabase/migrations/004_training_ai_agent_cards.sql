-- ============================================================
-- TRAINING AI AGENTS — cards (description + external reference id)
-- Run manually in the Supabase SQL Editor.
-- No RLS changes needed: the existing SELECT policy on
-- training_ai_agents already allows any authenticated user in the
-- same company to read rows (not just admins) — only INSERT/UPDATE/
-- DELETE are restricted to admin/super_admin, enforced in
-- app/actions/training-coach/agents.ts.
-- ============================================================

ALTER TABLE public.training_ai_agents
  ADD COLUMN description       text,
  ADD COLUMN external_agent_id text;
