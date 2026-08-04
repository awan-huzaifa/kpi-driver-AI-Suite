ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz DEFAULT NULL;
