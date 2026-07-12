-- Add per-user app access flags.
-- Admins assign these at invite time and can edit them later.
-- false = no access, true = can enter that app.

ALTER TABLE public.users
  ADD COLUMN app_underwriting   boolean NOT NULL DEFAULT false,
  ADD COLUMN app_sales_coach    boolean NOT NULL DEFAULT false,
  ADD COLUMN app_training_coach boolean NOT NULL DEFAULT false;

-- Existing admins and super_admins get full access to everything.
UPDATE public.users
  SET app_underwriting   = true,
      app_sales_coach    = true,
      app_training_coach = true
  WHERE access_role IN ('admin', 'super_admin');
