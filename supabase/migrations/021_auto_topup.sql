-- Auto top-up settings per company
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS auto_topup_enabled   boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_topup_threshold numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_topup_price_id  text          DEFAULT NULL;
