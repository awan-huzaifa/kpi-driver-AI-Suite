-- Check access level for a specific user by email.
-- Replace the email below before running.

SELECT
  u.email,
  u.full_name,
  u.access_role,
  u.agent_type,
  u.app_underwriting,
  u.app_sales_coach,
  u.app_training_coach,
  u.is_active,
  c.name AS company
FROM public.users u
LEFT JOIN public.companies c ON c.id = u.company_id
WHERE u.email = 'replace@withemail.com';
