ALTER TABLE public.billing_config
  ADD COLUMN IF NOT EXISTS rentcast_cost_usd numeric(10,6) DEFAULT 0.074000,
  ADD COLUMN IF NOT EXISTS axesso_cost_usd   numeric(10,6) DEFAULT 0.020000;

UPDATE public.billing_config
  SET rentcast_cost_usd = 0.074000,
      axesso_cost_usd   = 0.020000
  WHERE app = 'underwriting' AND company_id IS NULL;
