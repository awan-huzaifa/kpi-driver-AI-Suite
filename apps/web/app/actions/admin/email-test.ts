'use server'

import { createClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM_EMAIL } from '@/lib/email/client'
import { getPeriodBounds, REPORT_LABELS, type ReportType } from '@/lib/email/periods'
import { scAgentTypeTeamTemplate, SC_TYPE_ORDER, scRepTemplate, tcTeamTemplate, tcRepTemplate, uwTemplate, uwTeamTemplate } from '@/lib/email/templates'

export type TemplateId = 'sc-team' | 'sc-rep' | 'tc-team' | 'tc-rep' | 'uw-team' | 'uw-rep'

export interface SendResult {
  template: string
  to: string
  ok: boolean
  error?: string
}

function buildPeriod(periodType: ReportType) {
  const now = new Date()
  const tz  = 'America/New_York'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour12: false,
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
  const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const localDate = {
    year: Number(get('year')), month: Number(get('month')),
    day:  Number(get('day')),  dayOfWeek: DOW[get('weekday')] ?? 1,
  }
  // Force the date to satisfy period requirements so getPeriodBounds works regardless of real day
  const faked = periodType === 'weekly'  ? { ...localDate, dayOfWeek: 1 }
              : periodType === 'monthly' ? { ...localDate, day: 1 }
              : localDate
  return getPeriodBounds(periodType, faked)
}

export async function sendTestReportEmails(
  templates: TemplateId[],
  adminEmail: string,
  repEmail: string,
  period: ReportType,
  previewRepUserId?: string,
): Promise<SendResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: profile } = await supabase
    .from('users')
    .select('access_role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.access_role)) {
    throw new Error('Unauthorized')
  }

  const admin = createAdminClient()

  // Pick company: own company for admin, first company for super_admin
  let companyId = profile.company_id
  if (!companyId) {
    const { data: firstCo } = await admin.from('companies').select('id').limit(1).single()
    companyId = firstCo?.id ?? null
  }
  if (!companyId) throw new Error('No company found')

  const { data: company } = await admin.from('companies').select('id, name').eq('id', companyId).single()
  if (!company) throw new Error('Company not found')

  const { data: users } = await admin
    .from('users')
    .select('id, full_name, access_role, app_sales_coach, app_training_coach, app_underwriting')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const periodBounds = buildPeriod(period)
  const reportLabel  = REPORT_LABELS[period]
  const allUsers     = users ?? []

  // Resolve the preview rep once — no fallback when explicitly selected
  const previewRep = previewRepUserId
    ? allUsers.find(u => u.id === previewRepUserId) ?? null
    : null

  const results: SendResult[] = []
  const resend = getResend()

  for (const tplId of templates) {
    const to            = ['sc-team', 'tc-team', 'uw-team'].includes(tplId) ? adminEmail : (repEmail || adminEmail)
    const subjectPrefix = '[TEST] '

    try {
      let html = ''
      let subject = ''

      if (tplId === 'sc-team') {
        const { data: calls } = await admin
          .from('live_calls')
          .select('id, user_id, score, scorable, direction, duration_sec, call_result, created_at, evaluation, contact_name, crm_link, agent:users(full_name, agent_type)')
          .eq('company_id', companyId)
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        const allCalls = (calls ?? []) as any[]
        // For test preview: pick the first agent type that has calls
        const byType = new Map<string, any[]>()
        for (const c of allCalls) {
          const t = c.agent?.agent_type ?? 'none'
          if (!byType.has(t)) byType.set(t, [])
          byType.get(t)!.push(c)
        }
        const firstType = SC_TYPE_ORDER.find(t => byType.has(t)) ?? 'none'
        const typeCalls = byType.get(firstType) ?? allCalls
        html    = scAgentTypeTeamTemplate(firstType, company.name, periodBounds, typeCalls, reportLabel)
        subject = `Sales Coach ${firstType.toUpperCase()} Team Report — ${periodBounds.label}`
      }

      else if (tplId === 'sc-rep') {
        // If a specific rep is selected, query only their calls directly
        const scQuery = admin
          .from('live_calls')
          .select('id, user_id, score, scorable, direction, duration_sec, call_result, created_at, evaluation, agent:users(full_name, agent_type)')
          .eq('company_id', companyId)
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        if (previewRep) scQuery.eq('user_id', previewRep.id)

        const { data: calls } = await scQuery
        const allCalls = calls ?? []

        // Determine rep: if no selection, pick first rep with actual calls
        const repUser = previewRep
          ?? allUsers.find(u => u.access_role === 'user' && u.app_sales_coach && allCalls.some(c => c.user_id === u.id))
          ?? allUsers.find(u => u.access_role === 'user' && u.app_sales_coach)

        html    = scRepTemplate(repUser?.full_name ?? 'Agent', company.name, periodBounds, allCalls as any, reportLabel)
        subject = `Your Sales Coach Report — ${periodBounds.label}`
      }

      else if (tplId === 'tc-team') {
        const { data: calls } = await admin
          .from('training_calls')
          .select('id, user_id, score, scorable, call_result, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)')
          .eq('company_id', companyId)
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        html    = tcTeamTemplate(company.name, periodBounds, (calls ?? []) as any, reportLabel)
        subject = `Training Coach Team Report — ${periodBounds.label}`
      }

      else if (tplId === 'tc-rep') {
        const tcQuery = admin
          .from('training_calls')
          .select('id, user_id, score, scorable, call_result, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)')
          .eq('company_id', companyId)
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        if (previewRep) tcQuery.eq('user_id', previewRep.id)

        const { data: calls } = await tcQuery
        const allCalls = calls ?? []

        const repUser = previewRep
          ?? allUsers.find(u => u.access_role === 'user' && u.app_training_coach && allCalls.some(c => c.user_id === u.id))
          ?? allUsers.find(u => u.access_role === 'user' && u.app_training_coach)

        html    = tcRepTemplate(repUser?.full_name ?? 'Agent', company.name, periodBounds, allCalls as any, reportLabel)
        subject = `Your Training Report — ${periodBounds.label}`
      }

      else if (tplId === 'uw-team') {
        const { data: deals } = await admin
          .from('deals')
          .select('id, address, recommendation, arv_low, arv_high, max_offer, created_at, user_id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        const dealsWithNames = (deals ?? []).map(d => ({
          ...d, user_name: allUsers.find(u => u.id === d.user_id)?.full_name ?? null,
        }))
        html    = uwTeamTemplate(company.name, periodBounds, dealsWithNames as any, reportLabel)
        subject = `Deal Underwriting Team Report — ${periodBounds.label}`
      }

      else if (tplId === 'uw-rep') {
        const uwQuery = admin
          .from('deals')
          .select('id, address, recommendation, arv_low, arv_high, max_offer, created_at, user_id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('created_at', periodBounds.from)
          .lte('created_at', periodBounds.to)
        if (previewRep) uwQuery.eq('user_id', previewRep.id)

        const { data: deals } = await uwQuery
        const allDeals = deals ?? []

        const repUser = previewRep
          ?? allUsers.find(u => u.access_role === 'user' && u.app_underwriting && allDeals.some(d => d.user_id === u.id))
          ?? allUsers.find(u => u.access_role === 'user' && u.app_underwriting)

        html    = uwTemplate(repUser?.full_name ?? 'User', company.name, periodBounds, allDeals as any, reportLabel)
        subject = `Deal Underwriting Report — ${periodBounds.label}`
      }

      await resend.emails.send({ from: FROM_EMAIL, to, subject: subjectPrefix + subject, html })
      results.push({ template: tplId, to, ok: true })
    } catch (e) {
      results.push({ template: tplId, to, ok: false, error: e instanceof Error ? e.message : 'Failed' })
    }
  }

  return results
}
