ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_signin_consent_at timestamptz DEFAULT NULL;
