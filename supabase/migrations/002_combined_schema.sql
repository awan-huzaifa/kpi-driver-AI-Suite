-- ============================================================
-- KPI DRIVER — COMBINED SCHEMA
-- Run this once in a fresh Supabase project (SQL Editor).
-- Order: Sales Coach schema → Underwriting schema → Platform subscriptions
-- ============================================================


-- ============================================================
-- PART 1: SALES COACH
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE public.access_role    AS ENUM ('super_admin', 'admin', 'user');
CREATE TYPE public.agent_type     AS ENUM ('fus', 'acq', 'tc', 'cc', 'none');
CREATE TYPE public.call_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.period_type    AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE public.companies (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text        NOT NULL,
  ghl_sub_account_id text,
  credits_balance    integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id                  uuid               PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name           text,
  email               text,
  phone               text,
  access_role         public.access_role NOT NULL DEFAULT 'user',
  agent_type          public.agent_type  NOT NULL DEFAULT 'none',
  company_id          uuid               REFERENCES public.companies (id) ON DELETE SET NULL,
  is_active           boolean            NOT NULL DEFAULT true,
  digest_preferences  jsonb              DEFAULT '{"enabled": true, "periods": ["weekly"]}'::jsonb,
  created_at          timestamptz        NOT NULL DEFAULT now()
);

ALTER TABLE public.users
  ADD CONSTRAINT users_phone_unique UNIQUE (phone);

CREATE TABLE public.live_calls (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid                  NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  company_id     uuid                  NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  contact_name   text,
  contact_phone  text,
  agent_phone    text,
  direction      public.call_direction,
  duration_sec   integer,
  call_stage     text,
  scorable       boolean               NOT NULL DEFAULT false,
  score          integer,
  call_result    text,
  transcript     text,
  recording_url  text,
  crm_link       text,
  evaluation     jsonb,
  created_at     timestamptz           NOT NULL DEFAULT now()
);

CREATE TABLE public.training_calls (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid                  NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  company_id     uuid                  NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  agent_phone    text,
  ai_name        text,
  direction      public.call_direction,
  duration_sec   integer,
  call_stage     text,
  scorable       boolean               NOT NULL DEFAULT false,
  score          integer,
  call_result    text,
  transcript     text,
  recording_url  text,
  evaluation     jsonb,
  created_at     timestamptz           NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_digests (
  id            uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid               NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  company_id    uuid               NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  period_type   public.period_type NOT NULL,
  period_start  timestamptz        NOT NULL,
  period_end    timestamptz        NOT NULL,
  data          jsonb,
  sent_at       timestamptz        NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_transactions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  uuid        NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  amount      integer     NOT NULL,
  reason      text        NOT NULL,
  call_id     uuid        REFERENCES public.live_calls (id) ON DELETE SET NULL,
  created_by  uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- ── Helper functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_access_role()
RETURNS public.access_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT access_role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- ── Auto-create public.users row on signup / invite ──────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, access_role, agent_type)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    'user',
    'none'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Credit functions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credit(p_company_id uuid, p_call_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT credits_balance INTO v_balance
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < 1 THEN
    RETURN false;
  END IF;

  UPDATE public.companies
     SET credits_balance = credits_balance - 1
   WHERE id = p_company_id;

  INSERT INTO public.credit_transactions (company_id, amount, reason, call_id)
  VALUES (p_company_id, -1, 'call_scored', p_call_id);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_credits(
  p_company_id uuid,
  p_amount     integer,
  p_reason     text,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.companies
     SET credits_balance = credits_balance + p_amount
   WHERE id = p_company_id;

  INSERT INTO public.credit_transactions (company_id, amount, reason, created_by)
  VALUES (p_company_id, p_amount, p_reason, p_created_by);
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_calls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_calls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_digests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies: super_admin full access"
  ON public.companies FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "companies: admin and user read own"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_my_company_id());

CREATE POLICY "users: super_admin full access"
  ON public.users FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "users: admin and user read all"
  ON public.users FOR SELECT TO authenticated
  USING (public.get_my_access_role() IN ('admin', 'user'));

CREATE POLICY "live_calls: super_admin full access"
  ON public.live_calls FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "live_calls: admin and user read all"
  ON public.live_calls FOR SELECT TO authenticated
  USING (public.get_my_access_role() IN ('admin', 'user'));

CREATE POLICY "training_calls: super_admin full access"
  ON public.training_calls FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "training_calls: admin and user read all"
  ON public.training_calls FOR SELECT TO authenticated
  USING (public.get_my_access_role() IN ('admin', 'user'));

CREATE POLICY "daily_digests: super_admin full access"
  ON public.daily_digests FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "daily_digests: admin and user read all"
  ON public.daily_digests FOR SELECT TO authenticated
  USING (public.get_my_access_role() IN ('admin', 'user'));

CREATE POLICY "credit_tx: super_admin full access"
  ON public.credit_transactions FOR ALL TO authenticated
  USING (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "credit_tx: company read"
  ON public.credit_transactions FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());


-- ============================================================
-- PART 2: UNDERWRITING (Deal UW)
-- ============================================================

CREATE TABLE public.deals (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid     NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  address        text     NOT NULL,
  status         text     DEFAULT 'pending',   -- pending | completed | failed
  recommendation text,                         -- pursue | negotiate | pass
  arv_low        numeric,
  arv_high       numeric,
  max_offer      numeric,
  created_at     timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.underwriting_reports (
  id                  uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id             uuid     NOT NULL REFERENCES public.deals (id) ON DELETE CASCADE,
  user_id             uuid     NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  address             text     NOT NULL,
  beds                integer,
  baths               numeric,
  sqft                integer,
  year_built          integer,
  condition           text,
  arv_low             numeric,
  arv_high            numeric,
  avg_price_per_sqft  numeric,
  net_sales_price     numeric,
  repair_cost_low     numeric,
  repair_cost_high    numeric,
  investor_profit     numeric,
  max_offer_low       numeric,
  max_offer_high      numeric,
  as_is_floor_low     numeric,
  as_is_floor_high    numeric,
  property_data       jsonb,
  comps               jsonb,
  calculations        jsonb,
  ai_assessment       jsonb,
  flags               text[],
  recommendation      text,
  confidence          text,
  summary             text,
  created_at          timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.deals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.underwriting_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals: users manage own"
  ON public.deals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "underwriting_reports: users manage own"
  ON public.underwriting_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- PART 3: PLATFORM — SUBSCRIPTIONS
-- ============================================================

CREATE TABLE public.subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_customer_id     text        UNIQUE,
  stripe_subscription_id text        UNIQUE,
  plan_id                text        CHECK (plan_id IN ('starter', 'pro')),
  status                 text,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: users view own"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX ON public.subscriptions (stripe_customer_id);
CREATE INDEX ON public.subscriptions (stripe_subscription_id);


-- ============================================================
-- PART 4: EXPLICIT GRANTS (required for projects created after May 30 2026)
-- Without these, supabase-js / PostgREST cannot access any table.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Sales Coach tables
-- super_admin manages companies/users via RLS FOR ALL; others read only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users              TO authenticated;
-- live/training/daily_digests: authenticated users only read; writes go via service role
GRANT SELECT                         ON public.live_calls         TO authenticated;
GRANT SELECT                         ON public.training_calls     TO authenticated;
GRANT SELECT                         ON public.daily_digests      TO authenticated;
GRANT SELECT                         ON public.credit_transactions TO authenticated;

-- Underwriting tables — users manage their own rows (RLS enforces)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.underwriting_reports TO authenticated;

-- Platform subscriptions — users read their own row; writes via service role (webhook)
GRANT SELECT ON public.subscriptions TO authenticated;

-- Functions — needed so RLS policies that call these work for authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_access_role()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_company_id()                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credit(uuid, uuid)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, uuid)        TO authenticated;


-- ============================================================
-- PART 5: SUPER ADMIN SETUP
-- After running this migration:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
-- 2. Create your user with email + password via the dashboard UI
-- 3. Then run this to promote that user to super_admin:
--
--   UPDATE public.users
--   SET access_role = 'super_admin'
--   WHERE email = 'your-email@example.com';
-- ============================================================
