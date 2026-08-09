-- Notification preferences per user
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notify_reports        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_billing        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_reports_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_billing_locked boolean NOT NULL DEFAULT false;
