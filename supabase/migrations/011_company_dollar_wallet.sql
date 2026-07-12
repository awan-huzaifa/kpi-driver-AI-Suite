-- 011: Company dollar wallet
-- Replaces per-user balance (user_balances / balance_transactions) and per-company integer
-- credits (companies.credits_balance / credit_transactions) with a single per-company
-- dollar wallet plus a per-app billing multiplier config.

-- 1. Add wallet columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS wallet_balance   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 2. Company wallet transactions log
CREATE TABLE IF NOT EXISTS public.company_wallet_transactions (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid          NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  type                    text          NOT NULL CHECK (type IN ('topup', 'deduction')),
  amount_usd              numeric(12,4) NOT NULL,
  description             text,
  app                     text          CHECK (app IN ('underwriting', 'sales_coach', 'training_coach')),
  stripe_payment_intent_id text         UNIQUE,  -- NULL for deductions; idempotency guard for top-ups
  created_at              timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.company_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cwt: super_admin full"
  ON public.company_wallet_transactions FOR ALL TO authenticated
  USING  (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "cwt: admin read own company"
  ON public.company_wallet_transactions FOR SELECT TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_access_role() IN ('admin', 'super_admin')
  );

GRANT SELECT ON public.company_wallet_transactions TO authenticated;

CREATE INDEX cwt_company_created ON public.company_wallet_transactions (company_id, created_at DESC);

-- 3. Per-app billing multiplier config (actual AI cost × multiplier = amount deducted)
CREATE TABLE IF NOT EXISTS public.billing_config (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  app        text         NOT NULL UNIQUE CHECK (app IN ('underwriting', 'sales_coach', 'training_coach')),
  multiplier numeric(6,3) NOT NULL DEFAULT 1.3,
  updated_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_config: super_admin full"
  ON public.billing_config FOR ALL TO authenticated
  USING  (public.get_my_access_role() = 'super_admin')
  WITH CHECK (public.get_my_access_role() = 'super_admin');

CREATE POLICY "billing_config: admin read"
  ON public.billing_config FOR SELECT TO authenticated
  USING (public.get_my_access_role() IN ('admin', 'super_admin'));

GRANT SELECT ON public.billing_config TO authenticated;

-- Seed default multipliers (1.3 = 30% markup)
INSERT INTO public.billing_config (app, multiplier) VALUES
  ('underwriting',   1.3),
  ('sales_coach',    1.3),
  ('training_coach', 1.3)
ON CONFLICT (app) DO NOTHING;

-- 4. RPC: add_wallet_balance (called by webhook after successful payment)
CREATE OR REPLACE FUNCTION public.add_wallet_balance(
  p_company_id              uuid,
  p_amount_usd              numeric,
  p_description             text,
  p_stripe_payment_intent   text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- Idempotency: if this payment intent was already credited, return current balance without re-crediting
  IF p_stripe_payment_intent IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.company_wallet_transactions
      WHERE stripe_payment_intent_id = p_stripe_payment_intent
    ) THEN
      SELECT wallet_balance INTO v_new_balance FROM public.companies WHERE id = p_company_id;
      RETURN v_new_balance;
    END IF;
  END IF;

  UPDATE public.companies
     SET wallet_balance = wallet_balance + p_amount_usd
   WHERE id = p_company_id
  RETURNING wallet_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.company_wallet_transactions
    (company_id, type, amount_usd, description, stripe_payment_intent_id)
  VALUES
    (p_company_id, 'topup', p_amount_usd, p_description, p_stripe_payment_intent);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_wallet_balance TO service_role;

-- 5. RPC: deduct_wallet_balance (called after each AI workflow completes)
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_company_id  uuid,
  p_amount_usd  numeric,
  p_description text,
  p_app         text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE public.companies
     SET wallet_balance = wallet_balance - p_amount_usd
   WHERE id = p_company_id
  RETURNING wallet_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  INSERT INTO public.company_wallet_transactions
    (company_id, type, amount_usd, description, app)
  VALUES
    (p_company_id, 'deduction', p_amount_usd, p_description, p_app);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance TO service_role;
