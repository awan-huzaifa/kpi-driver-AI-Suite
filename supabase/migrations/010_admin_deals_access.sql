-- Admins can read all deals within their company.
-- Super admins can read all deals across all companies.
-- The existing "deals: users manage own" policy still covers INSERT/UPDATE/DELETE.

CREATE POLICY "deals: admin read own company"
  ON public.deals FOR SELECT TO authenticated
  USING (
    public.get_my_access_role() = 'super_admin'
    OR (
      public.get_my_access_role() = 'admin'
      AND user_id IN (
        SELECT id FROM public.users WHERE company_id = public.get_my_company_id()
      )
    )
  );

CREATE POLICY "underwriting_reports: admin read own company"
  ON public.underwriting_reports FOR SELECT TO authenticated
  USING (
    public.get_my_access_role() = 'super_admin'
    OR (
      public.get_my_access_role() = 'admin'
      AND user_id IN (
        SELECT id FROM public.users WHERE company_id = public.get_my_company_id()
      )
    )
  );
