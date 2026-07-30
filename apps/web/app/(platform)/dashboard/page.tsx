import { redirect } from 'next/navigation'
import { createClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PlanId } from '@kpidriver/auth/types'
import DashboardClient from './dashboard-client'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ no_access?: string }> }) {
  const params = await searchParams
  const noAccess = params.no_access === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase
      .from('users')
      .select('full_name, access_role, company_id, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing')
      .eq('id', user.id)
      .single(),
    supabase.from('subscriptions').select('plan_id, status').eq('user_id', user.id).single(),
  ])

  const planId     = sub?.plan_id as PlanId | null
  const isActive   = sub?.status === 'active' || sub?.status === 'trialing'
  const isAdmin    = profile?.access_role === 'admin' || profile?.access_role === 'super_admin'
  const isSuperAdmin = profile?.access_role === 'super_admin'
  const companyId  = profile?.company_id ?? null

  const admin = createAdminClient()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // For deals (no company_id column) — fetch company user IDs first
  let companyUserIds: string[] = []
  if (!isSuperAdmin && companyId) {
    const { data: companyUsers } = await admin
      .from('users')
      .select('id')
      .eq('company_id', companyId)
    companyUserIds = (companyUsers ?? []).map((u: { id: string }) => u.id)
  }

  // Fetch stats + wallet + recent activity in parallel
  const [
    liveCallsResult,
    dealsResult,
    trainingResult,
    walletResult,
    recentCallsResult,
    recentDealsResult,
    recentTrainingResult,
  ] = await Promise.all([
    // Monthly counts
    isSuperAdmin
      ? admin.from('live_calls').select('id', { count: 'exact', head: true }).gte('created_at', monthStart)
      : companyId
        ? admin.from('live_calls').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', monthStart)
        : Promise.resolve({ count: 0, error: null }),

    isSuperAdmin
      ? admin.from('deals').select('id', { count: 'exact', head: true }).gte('created_at', monthStart)
      : companyUserIds.length > 0
        ? admin.from('deals').select('id', { count: 'exact', head: true }).in('user_id', companyUserIds).gte('created_at', monthStart)
        : Promise.resolve({ count: 0, error: null }),

    isSuperAdmin
      ? admin.from('training_calls').select('id', { count: 'exact', head: true }).gte('created_at', monthStart)
      : companyId
        ? admin.from('training_calls').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', monthStart)
        : Promise.resolve({ count: 0, error: null }),

    // Wallet balance — admins only
    isAdmin && companyId
      ? admin.from('companies').select('wallet_balance').eq('id', companyId).single()
      : Promise.resolve({ data: null, error: null }),

    // unused slots kept so destructuring indices stay the same
    Promise.resolve({ data: [], error: null }),
    Promise.resolve({ data: [], error: null }),
    Promise.resolve({ data: [], error: null }),
  ])

  return (
    <DashboardClient
      noAccess={noAccess}
      user={{ email: user.email!, fullName: profile?.full_name ?? null }}
      planId={isActive ? planId : null}
      accessRole={profile?.access_role ?? 'user'}
      access={{
        underwriting:  isAdmin || (profile?.app_underwriting  ?? false),
        salesCoach:    isAdmin || (profile?.app_sales_coach   ?? false),
        trainingCoach: isAdmin || (profile?.app_training_coach ?? false),
        noteTaker:      isAdmin || (profile?.app_note_taker      ?? false),
        dataEnrichment: isAdmin || (profile?.app_data_enrichment ?? false),
        skipTracing:    isAdmin || (profile?.app_skip_tracing    ?? false),
      }}
      stats={{
        liveCalls:     liveCallsResult.count ?? 0,
        deals:         dealsResult.count     ?? 0,
        training:      trainingResult.count  ?? 0,
        walletBalance: (walletResult.data as any)?.wallet_balance ?? null,
      }}
    />
  )
}
