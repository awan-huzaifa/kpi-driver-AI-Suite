-- Allow any authenticated user to read all deals within their own company.
-- The existing "deals: users manage own" (FOR ALL) still restricts
-- INSERT/UPDATE/DELETE to the user's own rows.
-- Super admins are already covered by "deals: admin read own company".

CREATE POLICY "deals: users read own company"
  ON public.deals FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE company_id = public.get_my_company_id()
    )
  );
