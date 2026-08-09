import { redirect } from 'next/navigation'
import { createClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailTestClient from './email-test-client'

export default async function EmailTestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('access_role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.access_role)) {
    redirect('/dashboard')
  }

  const admin = createAdminClient()

  // Resolve company
  let companyId = profile.company_id
  if (!companyId) {
    const { data: firstCo } = await admin.from('companies').select('id').limit(1).single()
    companyId = firstCo?.id ?? null
  }

  // Fetch company users
  const { data: dbUsers } = companyId
    ? await admin
        .from('users')
        .select('id, full_name, access_role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name')
    : { data: [] }

  // Fetch their emails from auth
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const companyUsers = (dbUsers ?? []).map(u => ({
    id:       u.id,
    name:     u.full_name ?? u.id,
    email:    emailMap.get(u.id) ?? '',
    role:     u.access_role as string,
  })).filter(u => u.email)

  return <EmailTestClient currentUserId={user.id} currentUserEmail={user.email!} companyUsers={companyUsers} />
}
