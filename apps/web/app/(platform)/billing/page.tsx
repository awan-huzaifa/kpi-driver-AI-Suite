import { redirect } from 'next/navigation'
import { createClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TOP_UP_OPTIONS } from '@kpidriver/stripe/topup'
import type { PlanId } from '@kpidriver/auth/types'
import BillingClient from './billing-client'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, access_role, company_id, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.access_role === 'admin' || profile?.access_role === 'super_admin'
  if (!isAdmin) redirect('/dashboard')

  const companyId = profile?.company_id ?? null
  const admin = createAdminClient()

  const [{ data: sub }, { data: companyRow }, { data: appSpend }, { data: usageLogs }] = await Promise.all([
    supabase.from('subscriptions').select('plan_id, status').eq('user_id', user.id).single(),

    companyId
      ? admin.from('companies').select('wallet_balance, auto_topup_enabled, auto_topup_threshold, auto_topup_price_id').eq('id', companyId).single()
      : Promise.resolve({ data: null, error: null }),

    companyId
      ? admin.rpc('get_company_app_spend', { p_company_id: companyId })
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from('ai_usage_logs')
      .select('id, app, entity_id, entity_type, input_tokens, output_tokens, cost_usd, model, created_at, cost_breakdown')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  // Fetch addresses for deal-type usage logs
  const dealIds = (usageLogs ?? []).filter(r => r.entity_type === 'deal').map(r => r.entity_id)
  let dealAddresses: Record<string, string> = {}
  if (dealIds.length > 0) {
    const { data: deals } = await admin.from('deals').select('id, address').in('id', dealIds)
    dealAddresses = Object.fromEntries((deals ?? []).map((d: { id: string; address: string }) => [d.id, d.address]))
  }

  const planId   = sub?.plan_id as PlanId | null
  const isActive = sub?.status === 'active' || sub?.status === 'trialing'

  return (
    <BillingClient
      user={{ id: user.id, email: user.email!, fullName: profile?.full_name ?? null }}
      planId={isActive ? planId : null}
      accessRole={profile?.access_role ?? 'user'}
      access={{
        underwriting:  isAdmin || (profile?.app_underwriting   ?? false),
        salesCoach:    isAdmin || (profile?.app_sales_coach    ?? false),
        trainingCoach: isAdmin || (profile?.app_training_coach ?? false),
        noteTaker:      isAdmin || (profile?.app_note_taker      ?? false),
        dataEnrichment: isAdmin || (profile?.app_data_enrichment ?? false),
        skipTracing:    isAdmin || (profile?.app_skip_tracing    ?? false),
      }}
      balance={companyRow?.wallet_balance ?? 0}
      appSpend={appSpend ?? []}
      topUpOptions={TOP_UP_OPTIONS}
      usageLogs={usageLogs ?? []}
      dealAddresses={dealAddresses}
      autoTopup={{
        enabled:   companyRow?.auto_topup_enabled   ?? false,
        priceId:   companyRow?.auto_topup_price_id  ?? null,
        threshold: companyRow?.auto_topup_threshold ?? null,
      }}
    />
  )
}
