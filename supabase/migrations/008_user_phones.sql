-- User phones for Training Coach call matching.
-- A user can register multiple numbers they call from;
-- the training ingest route matches the "from" field against this table.

CREATE TABLE public.user_phones (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  phone      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_phones_phone_unique UNIQUE (phone)
);

ALTER TABLE public.user_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_phones: users manage own"
  ON public.user_phones FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.user_phones TO authenticated;
