// MILESTONE 1 ONLY — remove this file and replace with Supabase query in Milestone 2.

export type DummyKpiEvent = {
  id: string
  contact_id: string
  contact_name: string
  contact_type: string   // Lead | Realtor | Wholesaler | Cash Buyer (ACQ only)
  kpi_name: string
  kpi_type: 'ACQ' | 'DISPO'
  occurred_at: string
  user_name: string
  lead_source: string
  potential_profit: number | null
  // qualification fields — only populated for kpi_name === 'lead'
  quality:      'Qualified' | 'Disqualified' | 'Pending' | null
  date_created: string | null   // when contact was created in CRM (before occurred_at)
  stage:        string | null   // CRM stage at time of lead submission
}

export type CallerSession = {
  id: string
  agent_name: string
  log_date: string
  total_calls: number
  manual_calls: number
  talk_time_sec: number
  leads_submitted: number
}

// ── Seeded PRNG ───────────────────────────────────────────────────────────────

function lcg(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const rng    = lcg(42)
const pick   = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
const chance = (p: number): boolean => rng() < p

const callRng    = lcg(77)
const callPick   = <T>(arr: T[]): T => arr[Math.floor(callRng() * arr.length)]
const callChance = (p: number): boolean => callRng() < p

// ── Constants ─────────────────────────────────────────────────────────────────

const ACQ_REPS   = ['James Carter', 'Sarah Mitchell', 'Mike Reynolds', 'Alex Torres', 'Emma Davis']
const DISPO_REPS = ['Lisa Park', 'Tom Wilson', 'Kevin Nguyen', 'Rachel Foster', 'Marcus Bell', 'Diana Ortiz', 'Jason Tran']

const ACQ_LEAD_SOURCES   = ['Call', 'DM', 'PPL', 'PPC', 'Listed', 'SEO', 'Inbound Seller', 'SMS']
const DISPO_LEAD_SOURCES = ['SEO', 'Listed', 'PPL', 'DM', 'Inbound Buyer', 'Investor Lift', 'Realtor.com', 'Redfin', 'PPC', 'PropStream', 'SMS', 'Call', 'MLS', 'Facebook', 'Zillow']

// Contact types (ACQ only — who the cold caller reached)
const CONTACT_TYPES       = ['Lead', 'Realtor', 'Wholesaler', 'Cash Buyer']
const CONTACT_TYPE_WEIGHTS = [0.58, 0.22, 0.12, 0.08]  // cumulative

function pickContactType(): string {
  const r = rng()
  let cum = 0
  for (let i = 0; i < CONTACT_TYPE_WEIGHTS.length; i++) {
    cum += CONTACT_TYPE_WEIGHTS[i]
    if (r < cum) return CONTACT_TYPES[i]
  }
  return CONTACT_TYPES[0]
}

const CONTACT_NAMES = [
  'John Smith',      'Maria Garcia',     'David Johnson',    'Jennifer Williams', 'Michael Brown',
  'Patricia Davis',  'Robert Miller',    'Linda Wilson',     'James Moore',       'Barbara Taylor',
  'William Anderson','Elizabeth Thomas', 'Richard Jackson',  'Susan White',       'Joseph Harris',
  'Jessica Martin',  'Thomas Thompson',  'Sarah Garcia',     'Charles Martinez',  'Karen Robinson',
  'Christopher Clark','Lisa Rodriguez',  'Daniel Lewis',     'Betty Lee',         'Matthew Walker',
  'Dorothy Hall',    'Anthony Allen',    'Sandra Young',     'Mark Hernandez',    'Donna King',
  'Donald Wright',   'Carol Lopez',      'Steven Hill',      'Ruth Scott',        'Paul Green',
  'Sharon Adams',    'Andrew Baker',     'Michelle Gonzalez','Joshua Nelson',     'Laura Carter',
  'Kenneth Mitchell','Sarah Perez',      'Kevin Roberts',    'Kimberly Turner',   'Brian Phillips',
  'Deborah Campbell','George Parker',    'Amy Evans',        'Edward Edwards',    'Stephanie Collins',
]

const NOW    = Date.now()
const DAY_MS = 86_400_000

function stageDate(leadDayAgo: number, stageOffsetDays: number): string {
  const d = Math.max(leadDayAgo - stageOffsetDays, 0)
  return new Date(NOW - d * DAY_MS).toISOString()
}

// ── Quality / Qualification data ─────────────────────────────────────────────

export const DISPO_STAGES = [
  'New Potential Buyer', 'Showing Requested', 'Offer Received', 'Interested',
  'Contract Signed', 'Qualified', 'Responded', 'Dead', 'DND',
] as const

export const REGULAR_STAGES = [
  'Contacted Follow Up', 'Perseverant', '30 Day Nurture', '3 Months Nurture',
  '6 Months Nurture', '12 Months Nurture', 'Attempted Contact', 'Dispute Lead',
  'Needs Skip Tracing', 'Skiptrace Completed', 'Dead', 'dnd', 'ghosted',
] as const

export const VIP_STAGES = [
  'Responded', 'New Lead', 'Appointment Set', 'Offer Made', 'Offer Rejected',
  'Contract Sent', 'Contract Signed', 'Closed Deal', 'Negotiating', 'Cancelled Deal',
] as const

const qualRng = lcg(144)

type Quality = 'Qualified' | 'Disqualified' | 'Pending'
const QUALITY_WEIGHTS: { val: Quality; w: number }[] = [
  { val: 'Qualified',    w: 0.35 },
  { val: 'Pending',      w: 0.45 },
  { val: 'Disqualified', w: 0.20 },
]

function pickQuality(): Quality {
  const r = qualRng()
  let cum = 0
  for (const { val, w } of QUALITY_WEIGHTS) {
    cum += w
    if (r < cum) return val
  }
  return 'Pending'
}

function pickStage(): string {
  // 60% VIP stage, 40% regular stage
  const allStages = qualRng() < 0.60 ? VIP_STAGES : REGULAR_STAGES
  return allStages[Math.floor(qualRng() * allStages.length)]
}

const dispoQualRng = lcg(155)

function pickDispoQuality(): Quality {
  const r = dispoQualRng()
  let cum = 0
  for (const { val, w } of QUALITY_WEIGHTS) {
    cum += w
    if (r < cum) return val
  }
  return 'Pending'
}

function pickDispoStage(): string {
  return DISPO_STAGES[Math.floor(dispoQualRng() * DISPO_STAGES.length)]
}

let counter = 0
function evt(
  contactId: string, contactName: string, contactType: string,
  kpiName: string, kpiType: 'ACQ' | 'DISPO',
  userName: string, occurredAt: string, leadSource: string, profit: number | null = null,
  quality: 'Qualified' | 'Disqualified' | 'Pending' | null = null,
  dateCreated: string | null = null,
  stage: string | null = null,
): DummyKpiEvent {
  return {
    id: `dummy-${++counter}`,
    contact_id: contactId,
    contact_name: contactName,
    contact_type: contactType,
    kpi_name: kpiName,
    kpi_type: kpiType,
    occurred_at: occurredAt,
    user_name: userName,
    lead_source: leadSource,
    potential_profit: profit,
    quality,
    date_created: dateCreated,
    stage,
  }
}

// ── ACQ events ────────────────────────────────────────────────────────────────

function generateACQ(): DummyKpiEvent[] {
  const out: DummyKpiEvent[] = []

  for (let i = 0; i < 100; i++) {
    const cid         = `acq-${i}`
    const name        = CONTACT_NAMES[i % CONTACT_NAMES.length]
    const contactType = pickContactType()
    const rep         = ACQ_REPS[i % ACQ_REPS.length]
    const src         = pick(ACQ_LEAD_SOURCES)
    const day         = Math.floor(rng() * 27) + 2

    // lead event — add quality, date_created (1–14 days before lead), stage
    const createdDaysExtra = Math.floor(qualRng() * 14) + 1
    const dateCreated = stageDate(day + createdDaysExtra, 0)
    const qualDate    = stageDate(day, 0)
    const qual        = pickQuality()
    const stage       = pickStage()
    out.push(evt(cid, name, contactType, 'lead', 'ACQ', rep, qualDate, src, null, qual, dateCreated, stage))
    if (chance(0.90)) out.push(evt(cid, name, contactType, 'lead_assigned', 'ACQ', rep, stageDate(day, -0.1), src))

    if      (chance(0.08)) out.push(evt(cid, name, contactType, 'live_transfer_successful',   'ACQ', rep, stageDate(day, -0.2), src))
    else if (chance(0.06)) out.push(evt(cid, name, contactType, 'live_transfer_unsuccessful', 'ACQ', rep, stageDate(day, -0.2), src))

    if (!chance(0.38)) continue
    out.push(evt(cid, name, contactType, 'appointment_set', 'ACQ', rep, stageDate(day, 1), src))

    const apptRoll = rng()
    if (apptRoll < 0.20) { out.push(evt(cid, name, contactType, 'no_show',               'ACQ', rep, stageDate(day, 2), src)); continue }
    if (apptRoll < 0.33) { out.push(evt(cid, name, contactType, 'appointment_cancelled', 'ACQ', rep, stageDate(day, 2), src)); continue }
    out.push(evt(cid, name, contactType, 'appointment_held', 'ACQ', rep, stageDate(day, 2), src))

    if (!chance(0.60)) continue
    out.push(evt(cid, name, contactType, 'offer_made', 'ACQ', rep, stageDate(day, 3), src))

    if (chance(0.25)) { out.push(evt(cid, name, contactType, 'rejected_offer', 'ACQ', rep, stageDate(day, 4), src)); continue }

    out.push(evt(cid, name, contactType, 'contract_sent', 'ACQ', rep, stageDate(day, 5), src))

    if (chance(0.20)) { out.push(evt(cid, name, contactType, 'contract_rejected', 'ACQ', rep, stageDate(day, 7), src)); continue }

    out.push(evt(cid, name, contactType, 'contract_signed', 'ACQ', rep, stageDate(day, 8), src))

    const profit = 28000 + Math.floor(rng() * 52000)
    if (chance(0.85)) {
      out.push(evt(cid, name, contactType, 'closed_deal',    'ACQ', rep, stageDate(day, 12), src, profit))
    } else {
      out.push(evt(cid, name, contactType, 'cancelled_deal', 'ACQ', rep, stageDate(day, 12), src))
    }
  }

  return out
}

// ── DISPO events ──────────────────────────────────────────────────────────────

function generateDISPO(): DummyKpiEvent[] {
  const out: DummyKpiEvent[] = []

  for (let i = 0; i < 60; i++) {
    const cid  = `dispo-${i}`
    const name = CONTACT_NAMES[(i + 15) % CONTACT_NAMES.length]
    const rep  = DISPO_REPS[i % DISPO_REPS.length]
    const src  = pick(DISPO_LEAD_SOURCES)
    const day  = Math.floor(rng() * 27) + 2

    const dispoCreatedExtra = Math.floor(dispoQualRng() * 14) + 1
    const dispoDateCreated  = stageDate(day + dispoCreatedExtra, 0)
    const dispoQual         = pickDispoQuality()
    const dispoStage        = pickDispoStage()
    out.push(evt(cid, name, '', 'lead', 'DISPO', rep, stageDate(day, 0), src, null, dispoQual, dispoDateCreated, dispoStage))
    if (chance(0.92)) out.push(evt(cid, name, '', 'lead_assigned', 'DISPO', rep, stageDate(day, -0.1), src))

    if (!chance(0.55)) continue
    out.push(evt(cid, name, '', 'interested', 'DISPO', rep, stageDate(day, 1), src))

    if (!chance(0.70)) continue
    out.push(evt(cid, name, '', 'showing_requested', 'DISPO', rep, stageDate(day, 2), src))

    if (!chance(0.82)) continue
    out.push(evt(cid, name, '', 'showing_set', 'DISPO', rep, stageDate(day, 3), src))

    const showRoll = rng()
    if (showRoll < 0.18) { out.push(evt(cid, name, '', 'no_show',           'DISPO', rep, stageDate(day, 4), src)); continue }
    if (showRoll < 0.30) { out.push(evt(cid, name, '', 'showing_cancelled', 'DISPO', rep, stageDate(day, 4), src)); continue }
    out.push(evt(cid, name, '', 'showing_held', 'DISPO', rep, stageDate(day, 4), src))

    if (!chance(0.72)) continue
    out.push(evt(cid, name, '', 'offer_received', 'DISPO', rep, stageDate(day, 5), src))

    if (chance(0.22)) { out.push(evt(cid, name, '', 'offer_rejected', 'DISPO', rep, stageDate(day, 6), src)); continue }

    out.push(evt(cid, name, '', 'contract_sent_received', 'DISPO', rep, stageDate(day, 7), src))

    if (chance(0.25)) { out.push(evt(cid, name, '', 'contract_rejected', 'DISPO', rep, stageDate(day, 9), src)); continue }

    out.push(evt(cid, name, '', 'contract_signed', 'DISPO', rep, stageDate(day, 10), src))

    const profit = 12000 + Math.floor(rng() * 28000)
    if (chance(0.85)) {
      out.push(evt(cid, name, '', 'closed_deal',    'DISPO', rep, stageDate(day, 14), src, profit))
    } else {
      out.push(evt(cid, name, '', 'cancelled_deal', 'DISPO', rep, stageDate(day, 14), src))
    }
  }

  return out
}

export const DUMMY_EVENTS: DummyKpiEvent[] = [
  ...generateACQ(),
  ...generateDISPO(),
]

// ── Caller sessions ───────────────────────────────────────────────────────────
// Cold-calling dialer sessions per ACQ rep — source for Cold Calling KPI table.
// In Milestone 2 this maps to a `caller_sessions` table populated via GHL webhook.

function generateCallerSessions(): CallerSession[] {
  const out: CallerSession[] = []
  let sid = 0

  for (const agent of ACQ_REPS) {
    // 4–7 sessions per rep spread over last 28 days
    const sessionCount = Math.floor(callRng() * 4) + 4

    for (let s = 0; s < sessionCount; s++) {
      const daysAgo  = Math.floor(callRng() * 28) + 1
      const logDate  = new Date(NOW - daysAgo * DAY_MS).toISOString().slice(0, 10)
      const total    = Math.floor(callRng() * 120) + 60    // 60–179 total calls
      const manual   = Math.floor(callRng() * 30)  + 10    // 10–39 manual calls
      const talkSec  = Math.floor(callRng() * 5400) + 1800 // 30–120 min talk time
      const leads    = Math.floor(callRng() * 6)   + 1     // 1–6 leads submitted

      out.push({
        id:              `session-${++sid}`,
        agent_name:      agent,
        log_date:        logDate,
        total_calls:     total,
        manual_calls:    manual,
        talk_time_sec:   talkSec,
        leads_submitted: leads,
      })
    }
  }

  return out
}

export const DUMMY_CALLER_SESSIONS: CallerSession[] = generateCallerSessions()

// ── SMS sessions ──────────────────────────────────────────────────────────────
// Per-batch SMS blast data per ACQ rep.
// In Milestone 2 maps to a `sms_sessions` table populated via GHL webhook.

export type SmsSession = {
  id:              string
  agent_name:      string
  log_date:        string
  sms_sent:        number
  sms_delivered:   number  // for delivery_rate = delivered / sent
  sms_received:    number  // replies — for response_rate = received / sent
  sms_blocked:     number  // carrier blocks — for carrier_block_rate = blocked / sent
  leads_submitted: number
}

const smsRng = lcg(88)

function generateSmsSessions(): SmsSession[] {
  const out: SmsSession[] = []
  let sid = 0

  for (const agent of ACQ_REPS) {
    const sessionCount = Math.floor(smsRng() * 4) + 3   // 3–6 sessions per rep

    for (let s = 0; s < sessionCount; s++) {
      const daysAgo   = Math.floor(smsRng() * 28) + 1
      const logDate   = new Date(NOW - daysAgo * DAY_MS).toISOString().slice(0, 10)
      const sent      = Math.floor(smsRng() * 1200) + 400  // 400–1599 sent
      const blockRate = 0.02 + smsRng() * 0.07             // 2–9% blocked
      const blocked   = Math.round(sent * blockRate)
      const eligible  = sent - blocked
      const delivRate = 0.88 + smsRng() * 0.10             // 88–98% delivery of eligible
      const delivered = Math.round(eligible * delivRate)
      const respRate  = 0.03 + smsRng() * 0.12             // 3–15% response rate
      const received  = Math.round(delivered * respRate)
      const leads     = Math.floor(smsRng() * 6) + 1       // 1–6 leads submitted

      out.push({
        id:              `sms-${++sid}`,
        agent_name:      agent,
        log_date:        logDate,
        sms_sent:        sent,
        sms_delivered:   delivered,
        sms_received:    received,
        sms_blocked:     blocked,
        leads_submitted: leads,
      })
    }
  }

  return out
}

export const DUMMY_SMS_SESSIONS: SmsSession[] = generateSmsSessions()

// ── PPC lead metadata ─────────────────────────────────────────────────────────
// Extra fields on PPC contacts (from GHL custom fields).
// Keyed by contact_id — only exists for ACQ PPC leads.

export type PpcLeadMeta = {
  contact_id: string
  website:    string
  validity:   'valid' | 'invalid'
  form:       string
}

const ppcRng = lcg(99)

const PPC_WEBSITES = ['MainSite.com', 'LandingA.com', 'LandingB.com', 'PromoPage.com']
const PPC_FORMS    = ['Form 1', 'Form 2']

function generatePpcMeta(): PpcLeadMeta[] {
  // Find all ACQ PPC lead events
  const ppcLeads = DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ' && e.lead_source === 'PPC' && e.kpi_name === 'lead')
  return ppcLeads.map(e => ({
    contact_id: e.contact_id,
    website:    PPC_WEBSITES[Math.floor(ppcRng() * PPC_WEBSITES.length)],
    validity:   ppcRng() < 0.76 ? 'valid' : 'invalid',
    form:       PPC_FORMS[Math.floor(ppcRng() * PPC_FORMS.length)],
  }))
}

export const DUMMY_PPC_META: PpcLeadMeta[] = generatePpcMeta()

// ── DM lead metadata ──────────────────────────────────────────────────────────

export type DmLeadMeta = {
  contact_id: string
  campaign:   string
}

const dmRng = lcg(111)

const DM_CAMPAIGNS = [
  'Absentee Owners Q1', 'Pre-Foreclosure Spring', 'High Equity Fall',
  'Probate Mailer', 'Tax Delinquent Drive', 'Vacant Property Q2',
]

function generateDmMeta(): DmLeadMeta[] {
  const dmLeads = DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ' && e.lead_source === 'DM' && e.kpi_name === 'lead')
  return dmLeads.map(e => ({
    contact_id: e.contact_id,
    campaign:   DM_CAMPAIGNS[Math.floor(dmRng() * DM_CAMPAIGNS.length)],
  }))
}

export const DUMMY_DM_META: DmLeadMeta[] = generateDmMeta()

// ── SEO lead metadata ─────────────────────────────────────────────────────────

export type SeoLeadMeta = {
  contact_id: string
  website:    string
  validity:   'valid' | 'invalid'
  form:       string
}

const seoRng = lcg(133)

const SEO_WEBSITES = ['PropertySearch.com', 'HomeValues.com', 'SellFastNow.com', 'InvestorHub.com', 'QuickClosePro.com']
const SEO_FORMS    = ['Form 1', 'Form 2', 'Form 3']

function generateSeoMeta(): SeoLeadMeta[] {
  const seoLeads = DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ' && e.lead_source === 'SEO' && e.kpi_name === 'lead')
  return seoLeads.map(e => ({
    contact_id: e.contact_id,
    website:    SEO_WEBSITES[Math.floor(seoRng() * SEO_WEBSITES.length)],
    validity:   seoRng() < 0.72 ? 'valid' : 'invalid',
    form:       SEO_FORMS[Math.floor(seoRng() * SEO_FORMS.length)],
  }))
}

export const DUMMY_SEO_META: SeoLeadMeta[] = generateSeoMeta()

// ── PPL lead metadata ─────────────────────────────────────────────────────────

export type PplLeadMeta = {
  contact_id: string
  dispute:    'New' | 'Accepted' | 'Denied'
}

const pplRng = lcg(122)

const PPL_DISPUTE_WEIGHTS: { val: 'New' | 'Accepted' | 'Denied'; w: number }[] = [
  { val: 'New',      w: 0.55 },
  { val: 'Accepted', w: 0.30 },
  { val: 'Denied',   w: 0.15 },
]

function generatePplMeta(): PplLeadMeta[] {
  const pplLeads = DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ' && e.lead_source === 'PPL' && e.kpi_name === 'lead')
  return pplLeads.map(e => {
    const r = pplRng()
    let cum = 0
    let dispute: 'New' | 'Accepted' | 'Denied' = 'New'
    for (const { val, w } of PPL_DISPUTE_WEIGHTS) {
      cum += w
      if (r < cum) { dispute = val; break }
    }
    return { contact_id: e.contact_id, dispute }
  })
}

export const DUMMY_PPL_META: PplLeadMeta[] = generatePplMeta()

// ── Helpers re-exported for convenience ──────────────────────────────────────
export { ACQ_LEAD_SOURCES, DISPO_LEAD_SOURCES, PPC_WEBSITES, PPC_FORMS, DM_CAMPAIGNS, SEO_WEBSITES, SEO_FORMS }

// ── CEO Dashboard — financial dummy data ─────────────────────────────────────

export const ACQ_LEAD_SOURCE_COSTS: Record<string, number> = {
  'Call':           3200,
  'PPC':            8500,
  'SEO':            2100,
  'DM':             1800,
  'PPL':            4200,
  'Listed':         1200,
  'SMS':             900,
  'Inbound Seller':  500,
}

export const DISPO_LEAD_SOURCE_COSTS: Record<string, number> = {
  'SEO':            2800,
  'Listed':         1500,
  'PPL':            3200,
  'DM':             1600,
  'PPC':            4200,
  'Zillow':         2100,
  'Redfin':         1800,
  'PropStream':     1200,
  'Facebook':       3500,
  'Inbound Buyer':   500,
  'Investor Lift':  1000,
  'Realtor.com':    2500,
  'SMS':             800,
  'Call':           1100,
  'MLS':             300,
}

export const CEO_EXPENSES = [
  { category: 'Commission',  amount: 12000 },
  { category: 'Admin',       amount:  4500 },
  { category: 'Draws',       amount:  8000 },
  { category: 'Dispo Fees',  amount:  2200 },
  { category: 'Payroll',     amount: 18000 },
  { category: 'Software',    amount:  1800 },
] as const

export const EXIT_STRATEGIES = ['Wholesale', 'Fix & Flip', 'Seller Finance', 'Subject To', 'Novation'] as const
export type ExitStrategy = typeof EXIT_STRATEGIES[number]

const exitRng = lcg(166)

export const DUMMY_EXIT_STRATEGIES = new Map<string, ExitStrategy>(
  DUMMY_EVENTS
    .filter(e => e.kpi_name === 'closed_deal')
    .map(e => [e.contact_id, EXIT_STRATEGIES[Math.floor(exitRng() * EXIT_STRATEGIES.length)] as ExitStrategy])
)
