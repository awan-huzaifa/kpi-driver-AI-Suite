-- ============================================================
-- TRAINING AI AGENTS — support globally-shared agents
-- Run manually in the Supabase SQL Editor.
-- company_id = NULL means the agent is shared across every
-- company (e.g. a general roleplay persona), not company-owned.
-- Only super_admin can create/manage these (enforced both in RLS
-- below and in app/actions/training-coach/agents.ts).
-- ============================================================

ALTER TABLE public.training_ai_agents ALTER COLUMN company_id DROP NOT NULL;

DROP POLICY IF EXISTS "training_ai_agents: company members view own" ON public.training_ai_agents;

CREATE POLICY "training_ai_agents: company members view own or global"
  ON public.training_ai_agents FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR company_id = public.get_my_company_id()
    OR public.get_my_access_role() = 'super_admin'
  );

-- ── Seed: general roleplay personas (shared across all companies) ──
-- Phone numbers below are placeholders — update once real Assistable
-- numbers are assigned, via the /training-coach/agents UI or:
--   UPDATE public.training_ai_agents SET phone_number = '+1...' WHERE external_agent_id = '...';

INSERT INTO public.training_ai_agents (company_id, agent_name, phone_number, description, external_agent_id) VALUES
  (NULL, 'Skeptical Homeowner',            '+17869471774','A deeply distrustful homeowner who challenges every motive, answers questions with questions, and makes reps earn trust from 2/10. Tests transparency, objection handling, and patience under pressure.', 'cmqqrozo5001xlb042n66xq4w'),
  (NULL, 'The Unrealistic Value Seller',    '+17869471617', 'A homeowner emotionally anchored to an inflated price. She''ll cite Zestimate, neighbor sales, and every renovation she''s ever made to justify her number. Tests a rep''s ability to handle valuation objections without triggering defensiveness.', 'cmqqrpv52001njv04dsno7mku'),
  (NULL, 'The Burned Seller',               '+17869471711', 'A seller hardened by failed deals, last-minute backouts, and earnest money disputes. He compares every promise to ones he''s heard before and demands proof over words. Tests a rep''s ability to build credibility and stay consistent under heavy skepticism.', 'cmqqrqd9a001wl4049pth8xal'),
  (NULL, 'The Family Gatekeeper',           '+17869471699', 'A conflict-averse homeowner who never decides alone. She defers everything to family consensus, deflects with "we need to discuss it," and stalls when pressured. Tests a rep''s ability to identify hidden decision-makers and navigate multi-stakeholder selling.', 'cmqqrqia60029l404bt10hitg'),
  (NULL, 'The Prideful DIY Seller',         '+17869471688', 'A self-taught real estate expert who thinks he knows more than the pros. He''ll challenge your numbers, cite market reports, and correct any generalization. Tests a rep''s ability to engage intellectually, hold their ground with data, and earn respect without ego clashes.', 'cmqqrqt9m0022lb04ihxiz6cc'),
  (NULL, 'The Inherited Property Heir',     '+17869471677', 'A grieving daughter navigating an inherited home she''s emotionally attached to but practically overwhelmed by. She''s juggling siblings, probate complexity, and legal anxiety. Tests a rep''s ability to slow down, simplify the process, and guide a stressed, consensus-driven seller.', 'cmqqrqzas0029lb0472dzzx92'),
  (NULL, 'The Elderly Independent Seller',  '+17869471788', 'A 78-year-old retired principal who''s managed her own affairs for decades and won''t be rushed or patronized. She''s formal, methodical, and fiercely independent. Tests a rep''s patience, professionalism, and ability to respect autonomy while gently guiding a slow, deliberate decision-maker.', 'cmqqrr5xy002cl40482xvlulz'),
  (NULL, 'The Widowed Homeowner',           '+17869471799', 'A 72-year-old widow who sees her home of 38 years as the last connection to her late husband Robert. She''s emotionally fragile, story-driven, and deeply hesitant. Tests a rep''s empathy, patience, and ability to navigate grief without being dismissive or pushy.', 'cmqqrrbf5002fl404h32wzwui'),
  (NULL, 'The Recently Divorced Seller',    '+17869471701', 'A recently divorced homeowner selling under emotional and financial strain. She''s indecisive, volatile, and constantly pulled between her ex''s involvement and her own need for closure. Tests a rep''s ability to stay grounded, offer reassurance, and keep the deal moving through emotional chaos.', 'cmqqrrfg5002il404ffzau1ls'),
  (NULL, 'The Financially Distressed Seller','+17869471777', 'A homeowner quietly facing foreclosure, driven by shame and fear rather than strategy. She deflects financial questions, downplays urgency, and guards her full situation until trust is earned. Tests a rep''s ability to uncover hidden distress with sensitivity and create safety without prying.', 'cmqqrrljd002clb04nh2pxawd');
