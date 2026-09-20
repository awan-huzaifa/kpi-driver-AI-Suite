'use client'

import { useState, useMemo } from 'react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS, DUMMY_CALLER_SESSIONS, DUMMY_SMS_SESSIONS, REGULAR_STAGES, VIP_STAGES, type DummyKpiEvent } from '../dummy-data'
import SourcePicker from '../source-picker'

// ── helpers ───────────────────────────────────────────────────────────────────

function uniqueAt(events: DummyKpiEvent[], ...kpiNames: string[]): number {
  const s = new Set<string>()
  for (const e of events) if (kpiNames.includes(e.kpi_name)) s.add(e.contact_id)
  return s.size
}

function pct(num: number, den: number): string {
  if (!den || !num) return '0%'
  return (num / den * 100).toFixed(1) + '%'
}

function fmtTalkTime(sec: number): string {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtAvgDuration(sec: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function ratioColor(val: number | null | undefined): string {
  if (val == null) return C.dimText
  if (val >= 80) return C.green
  if (val >= 60) return '#78c97e'
  if (val >= 40) return C.yellow
  if (val >= 20) return '#f59e0b'
  if (val >   0) return C.red
  return C.dimText
}

// ── positive / negative KPI sets ─────────────────────────────────────────────

const POSITIVE_KPIS = [
  { key: 'lead_assigned',            label: 'Lead Assigned'  },
  { key: 'live_transfer_successful', label: 'Live Trans. ✓'  },
  { key: 'appointment_set',          label: 'Appt Set'       },
  { key: 'appointment_held',         label: 'Appt Held'      },
  { key: 'offer_made',               label: 'Offer Made'     },
  { key: 'contract_sent',            label: 'Contract Sent'  },
  { key: 'contract_signed',          label: 'Signed'         },
  { key: 'closed_deal',              label: 'Closed'         },
]

const NEGATIVE_KPIS = [
  { key: 'live_transfer_unsuccessful', label: 'Live Trans. ✗'  },
  { key: 'no_show',                    label: 'No Show'        },
  { key: 'appointment_cancelled',      label: 'Appt Cancelled' },
  { key: 'rejected_offer',             label: 'Rej. Offer'     },
  { key: 'contract_rejected',          label: 'Contract Rej.'  },
  { key: 'cancelled_deal',             label: 'Cancelled'      },
]

// ── funnel config ─────────────────────────────────────────────────────────────

const ACQ_REPS = ['James Carter', 'Sarah Mitchell', 'Mike Reynolds', 'Alex Torres', 'Emma Davis']

const MAIN_STAGES = [
  { key: 'lead',             label: 'Lead'             },
  { key: 'lead_assigned',    label: 'Lead Assigned'    },
  { key: 'appointment_set',  label: 'Appointment Set'  },
  { key: 'appointment_held', label: 'Appointment Held' },
  { key: 'offer_made',       label: 'Offer Made'       },
  { key: 'contract_sent',    label: 'Contract Sent'    },
  { key: 'contract_signed',  label: 'Contract Signed'  },
  { key: 'closed_deal',      label: 'Closed Deal'      },
]

const DROPOFFS: Record<string, { key: string; label: string; color: string }[]> = {
  appointment_set: [
    { key: 'live_transfer_successful',   label: 'Live Transfer ✓', color: C.green },
    { key: 'live_transfer_unsuccessful', label: 'Live Transfer ✗', color: C.red   },
  ],
  appointment_held: [
    { key: 'no_show',               label: 'No Show',        color: C.red     },
    { key: 'appointment_cancelled', label: 'Appt Cancelled', color: '#64748b' },
  ],
  offer_made: [
    { key: 'rejected_offer', label: 'Offer Rejected', color: C.red },
  ],
  contract_sent: [
    { key: 'contract_rejected', label: 'Contract Rejected', color: C.red },
  ],
  closed_deal: [
    { key: 'cancelled_deal', label: 'Cancelled Deal', color: C.red },
  ],
}

// ── key ratios (6 sequential step-to-step) ────────────────────────────────────

const KEY_RATIOS = [
  { from: 'lead',             to: 'appointment_set',  label: 'Lead to Appt Set'   },
  { from: 'appointment_set',  to: 'appointment_held', label: 'Appt Set to Held'   },
  { from: 'appointment_held', to: 'offer_made',       label: 'Held to Offer'      },
  { from: 'offer_made',       to: 'contract_sent',    label: 'Offer to Contract'  },
  { from: 'contract_sent',    to: 'contract_signed',  label: 'Sent to Signed'     },
  { from: 'contract_signed',  to: 'closed_deal',      label: 'Signed to Closed'   },
]

// ── full 56-ratio matrix (CSV-exact) ─────────────────────────────────────────

const MATRIX_COLS = [
  { key: 'appointment_set',          label: 'Appt Set'     },
  { key: 'appointment_held',         label: 'Appt Held'    },
  { key: 'no_show',                  label: 'No-Show'      },
  { key: 'appointment_cancelled',    label: 'Appt Cancel'  },
  { key: 'live_transfer_successful', label: 'Live Trans.'  },
  { key: 'offer_made',               label: 'Offer Made'   },
  { key: 'rejected_offer',           label: 'Rej. Offer'   },
  { key: 'contract_sent',            label: 'Cont. Sent'   },
  { key: 'contract_rejected',        label: 'Cont. Rej.'   },
  { key: 'contract_signed',          label: 'Signed'       },
  { key: 'closed_deal',              label: 'Closed'       },
  { key: 'cancelled_deal',           label: 'Cancelled'    },
]

// valid = the set of "to" keys that exist in the CSV for this "from" row
const MATRIX_ROWS: { key: string; label: string; valid: Set<string> }[] = [
  { key: 'lead',                  label: 'Lead',           valid: new Set(['appointment_set','appointment_held','no_show','appointment_cancelled','live_transfer_successful','offer_made','rejected_offer','contract_sent','contract_rejected','contract_signed','closed_deal','cancelled_deal']) },
  { key: 'appointment_set',       label: 'Appt Set',       valid: new Set(['appointment_held','no_show','appointment_cancelled','offer_made','rejected_offer','contract_sent','contract_rejected','contract_signed','closed_deal','cancelled_deal']) },
  { key: 'appointment_held',      label: 'Appt Held',      valid: new Set(['offer_made','rejected_offer','contract_sent','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'live_transfer_successful', label: 'Live Transfer', valid: new Set(['offer_made','rejected_offer','contract_sent','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'offer_made',            label: 'Offer Made',     valid: new Set(['rejected_offer','contract_sent','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'rejected_offer',        label: 'Rej. Offer',     valid: new Set(['contract_sent','contract_signed','closed_deal','cancelled_deal']) },
  { key: 'contract_sent',         label: 'Cont. Sent',     valid: new Set(['contract_rejected','contract_signed','closed_deal','cancelled_deal']) },
  { key: 'contract_rejected',     label: 'Cont. Rejected', valid: new Set(['contract_signed','closed_deal','cancelled_deal']) },
  { key: 'contract_signed',       label: 'Cont. Signed',   valid: new Set(['closed_deal','cancelled_deal']) },
  { key: 'closed_deal',           label: 'Closed Deal',    valid: new Set(['cancelled_deal']) },
]

// ── main ──────────────────────────────────────────────────────────────────────

type RatioData = { pct: number; from: number; to: number }

export default function AcqFunnelClient() {
  const [period,      setPeriod]      = useState<DatePeriod>('30d')
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [selectedRep, setSelectedRep] = useState<string | null>(null)
  const [leadSource,  setLeadSource]  = useState('')
  const [netKpi,      setNetKpi]      = useState(false)

  const allLeadSources = useMemo(() =>
    [...new Set(DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ' && e.kpi_name === 'lead').map(e => e.lead_source))].sort()
  , [])

  const netKpiContactIds = useMemo(() => {
    if (!netKpi) return null
    const { from, to } = periodBounds(period, customFrom, customTo)
    const s = new Set<string>()
    for (const e of DUMMY_EVENTS) {
      if (e.kpi_name !== 'lead' || !e.date_created) continue
      const d = new Date(e.date_created)
      if (from && d < from) continue
      if (to   && d > to)   continue
      s.add(e.contact_id)
    }
    return s
  }, [netKpi, period, customFrom, customTo])

  const filtered = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (e.kpi_type !== 'ACQ') return false
      if (selectedRep && e.user_name !== selectedRep) return false
      if (leadSource  && e.lead_source !== leadSource) return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      if (netKpiContactIds && !netKpiContactIds.has(e.contact_id)) return false
      return true
    })
  }, [period, customFrom, customTo, selectedRep, leadSource, netKpiContactIds])

  // Stage counts (unique contacts per kpi_name)
  const counts = useMemo(() => {
    const allKeys = [
      ...MAIN_STAGES.map(s => s.key),
      ...Object.values(DROPOFFS).flat().map(d => d.key),
    ]
    return Object.fromEntries(allKeys.map(k => [k, uniqueAt(filtered, k)]))
  }, [filtered])

  const leadCount   = Math.max(counts['lead'] ?? 0, 1)
  const totalProfit = filtered
    .filter(e => e.kpi_name === 'closed_deal' && e.potential_profit != null)
    .reduce((sum, e) => sum + (e.potential_profit ?? 0), 0)

  // All 56 conversion ratios — correct contact-intersection computation
  const allRatios = useMemo(() => {
    const result: Record<string, RatioData | null> = {}
    for (const row of MATRIX_ROWS) {
      const fromSet = new Set(filtered.filter(e => e.kpi_name === row.key).map(e => e.contact_id))
      for (const col of MATRIX_COLS) {
        const k = `${row.key}→${col.key}`
        if (!row.valid.has(col.key) || fromSet.size === 0) { result[k] = null; continue }
        const toSet = new Set(
          filtered.filter(e => e.kpi_name === col.key && fromSet.has(e.contact_id)).map(e => e.contact_id)
        )
        result[k] = { pct: (toSet.size / fromSet.size) * 100, from: fromSet.size, to: toSet.size }
      }
    }
    return result
  }, [filtered])

  // Rep breakdown
  const repRows = useMemo(() => {
    type R = { leads: Set<string>; apptSetFor: Set<string>; apptSetBy: Set<string>; apptHeld: Set<string>; offers: Set<string>; signed: Set<string>; closed: Set<string> }
    const map = new Map<string, R>()
    for (const e of filtered) {
      if (!map.has(e.user_name)) map.set(e.user_name, { leads: new Set(), apptSetFor: new Set(), apptSetBy: new Set(), apptHeld: new Set(), offers: new Set(), signed: new Set(), closed: new Set() })
      const r = map.get(e.user_name)!
      if (e.kpi_name === 'lead')             r.leads.add(e.contact_id)
      if (e.kpi_name === 'appointment_set') {
        // Dummy split: contacts starting a-m = "set by" this rep; n-z/digits = "set for" this rep
        const code = e.contact_id.charCodeAt(0)
        if (code >= 97 && code <= 109) r.apptSetBy.add(e.contact_id)
        else r.apptSetFor.add(e.contact_id)
      }
      if (e.kpi_name === 'appointment_held') r.apptHeld.add(e.contact_id)
      if (e.kpi_name === 'offer_made')       r.offers.add(e.contact_id)
      if (e.kpi_name === 'contract_signed')  r.signed.add(e.contact_id)
      if (e.kpi_name === 'closed_deal')      r.closed.add(e.contact_id)
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        leads: d.leads.size, apptSetFor: d.apptSetFor.size, apptSetBy: d.apptSetBy.size,
        apptHeld: d.apptHeld.size, offers: d.offers.size, signed: d.signed.size, closed: d.closed.size,
        conv: d.leads.size > 0 ? (d.closed.size / d.leads.size * 100).toFixed(1) + '%' : '0%',
      }))
      .sort((a, b) => b.closed - a.closed || b.leads - a.leads)
  }, [filtered])

  // ── performance metrics per agent ────────────────────────────────────────────

  const perfRows = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    const callMap = new Map<string, { calls: number; talkSec: number }>()
    for (const s of DUMMY_CALLER_SESSIONS) {
      const d = new Date(s.log_date)
      if (from && d < from) continue
      if (to   && d > to)   continue
      if (selectedRep && s.agent_name !== selectedRep) continue
      const cur = callMap.get(s.agent_name) ?? { calls: 0, talkSec: 0 }
      cur.calls   += s.total_calls
      cur.talkSec += s.talk_time_sec
      callMap.set(s.agent_name, cur)
    }
    const smsMap = new Map<string, number>()
    for (const s of DUMMY_SMS_SESSIONS) {
      const d = new Date(s.log_date)
      if (from && d < from) continue
      if (to   && d > to)   continue
      if (selectedRep && s.agent_name !== selectedRep) continue
      smsMap.set(s.agent_name, (smsMap.get(s.agent_name) ?? 0) + s.sms_sent)
    }
    const leadMap = new Map<string, Set<string>>()
    for (const e of filtered) {
      if (e.kpi_name !== 'lead') continue
      if (!leadMap.has(e.user_name)) leadMap.set(e.user_name, new Set())
      leadMap.get(e.user_name)!.add(e.contact_id)
    }
    const agents = new Set([...callMap.keys(), ...smsMap.keys(), ...leadMap.keys()])
    return [...agents].map(agent => {
      const c = callMap.get(agent) ?? { calls: 0, talkSec: 0 }
      return {
        agent,
        talkSec:     c.talkSec,
        totalCalls:  c.calls,
        uniqueLeads: leadMap.get(agent)?.size ?? 0,
        smsSent:     smsMap.get(agent) ?? 0,
        avgDurSec:   c.calls > 0 ? Math.round(c.talkSec / c.calls) : 0,
      }
    }).sort((a, b) => b.totalCalls - a.totalCalls || b.uniqueLeads - a.uniqueLeads)
  }, [filtered, period, customFrom, customTo, selectedRep])

  // ── per-agent KPI matrix ──────────────────────────────────────────────────────

  const agentKpiMatrix = useMemo(() => {
    const result = new Map<string, Map<string, number>>()
    for (const e of filtered) {
      if (!result.has(e.user_name)) result.set(e.user_name, new Map())
      const m = result.get(e.user_name)!
      m.set(e.kpi_name, (m.get(e.kpi_name) ?? 0) + 1)
    }
    return result
  }, [filtered])

  const matrixAgents = useMemo(() =>
    [...new Set(filtered.map(e => e.user_name))].sort()
  , [filtered])

  const posKpiMaxes = useMemo(() => {
    const m = new Map<string, number>()
    for (const k of POSITIVE_KPIS) {
      let max = 0
      for (const a of matrixAgents) { const v = agentKpiMatrix.get(a)?.get(k.key) ?? 0; if (v > max) max = v }
      m.set(k.key, max)
    }
    return m
  }, [agentKpiMatrix, matrixAgents])

  const negKpiMaxes = useMemo(() => {
    const m = new Map<string, number>()
    for (const k of NEGATIVE_KPIS) {
      let max = 0
      for (const a of matrixAgents) { const v = agentKpiMatrix.get(a)?.get(k.key) ?? 0; if (v > max) max = v }
      m.set(k.key, max)
    }
    return m
  }, [agentKpiMatrix, matrixAgents])

  // ── qualification useMemos (lead events only) ─────────────────────────────

  const leadEvents = useMemo(() =>
    filtered.filter(e => e.kpi_name === 'lead' && e.quality != null)
  , [filtered])

  // Qual status × lead source  →  { source → { qual → count } }
  const qualBySource = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of leadEvents) {
      const q = e.quality!
      if (!map.has(e.lead_source)) map.set(e.lead_source, new Map())
      const inner = map.get(e.lead_source)!
      inner.set(q, (inner.get(q) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  // Qual status × regular stage  →  { stage → { qual → count } }
  const qualByRegularStage = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of leadEvents) {
      if (!e.stage || !(REGULAR_STAGES as readonly string[]).includes(e.stage)) continue
      const q = e.quality!
      if (!map.has(e.stage)) map.set(e.stage, new Map())
      map.get(e.stage)!.set(q, (map.get(e.stage)!.get(q) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  // Qual status × VIP stage  →  { stage → { qual → count } }
  const qualByVipStage = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of leadEvents) {
      if (!e.stage || !(VIP_STAGES as readonly string[]).includes(e.stage)) continue
      const q = e.quality!
      if (!map.has(e.stage)) map.set(e.stage, new Map())
      map.get(e.stage)!.set(q, (map.get(e.stage)!.get(q) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  // Lead source → agent → qual → count
  const qualBySourceAgent = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, number>>>()
    for (const e of leadEvents) {
      if (!map.has(e.lead_source)) map.set(e.lead_source, new Map())
      const agents = map.get(e.lead_source)!
      if (!agents.has(e.user_name)) agents.set(e.user_name, new Map())
      const quals = agents.get(e.user_name)!
      quals.set(e.quality!, (quals.get(e.quality!) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  const QUAL_COLS = ['Qualified', 'Pending', 'Disqualified'] as const
  const QUAL_COLORS: Record<string, string> = {
    Qualified: C.green, Pending: C.yellow, Disqualified: C.red,
  }

  // ── Speed to KPI ─────────────────────────────────────────────────────────────
  // For each contact that progressed A → B, measure the elapsed time in hours.
  // Returns { label, avgHours, medHours, count, fromKey, toKey }

  const SPEED_STEPS = [
    { fromKey: 'lead',             toKey: 'lead_assigned',    label: 'Lead → Assigned',   color: '#7c3aed', icon: '⚡' },
    { fromKey: 'lead',             toKey: 'appointment_set',  label: 'Lead → Appt Set',   color: C.blue,    icon: '📅' },
    { fromKey: 'appointment_set',  toKey: 'appointment_held', label: 'Appt Set → Held',   color: '#0891b2', icon: '🤝' },
    { fromKey: 'appointment_held', toKey: 'offer_made',       label: 'Held → Offer',      color: C.yellow,  icon: '💰' },
    { fromKey: 'offer_made',       toKey: 'contract_signed',  label: 'Offer → Signed',    color: '#f97316', icon: '✍️' },
    { fromKey: 'contract_signed',  toKey: 'closed_deal',      label: 'Signed → Closed',   color: C.green,   icon: '🏁' },
  ]

  const speedData = useMemo(() => {
    // Build a map: contact_id → { kpi_name → occurred_at }
    const contactTimes = new Map<string, Map<string, number>>()
    for (const e of filtered) {
      if (!contactTimes.has(e.contact_id)) contactTimes.set(e.contact_id, new Map())
      const t = new Date(e.occurred_at).getTime()
      const existing = contactTimes.get(e.contact_id)!.get(e.kpi_name)
      // keep earliest occurrence if duplicates
      if (existing == null || t < existing) contactTimes.get(e.contact_id)!.set(e.kpi_name, t)
    }

    return SPEED_STEPS.map(step => {
      const deltas: number[] = []
      for (const [, times] of contactTimes) {
        const fromT = times.get(step.fromKey)
        const toT   = times.get(step.toKey)
        if (fromT == null || toT == null || toT <= fromT) continue
        deltas.push((toT - fromT) / (1000 * 3600)) // hours
      }
      if (deltas.length === 0) return { ...step, avgHours: null, medHours: null, count: 0 }
      deltas.sort((a, b) => a - b)
      const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length
      const med = deltas[Math.floor(deltas.length / 2)]
      return { ...step, avgHours: avg, medHours: med, count: deltas.length }
    })
  }, [filtered])

  function fmtHours(h: number): string {
    if (h < 1)   return `${Math.round(h * 60)}m`
    if (h < 24)  return `${h.toFixed(1)}h`
    const days = h / 24
    return days < 7 ? `${days.toFixed(1)}d` : `${(days / 7).toFixed(1)}w`
  }

  function speedColor(h: number, stepIndex: number): string {
    // thresholds vary by step — later steps are naturally slower
    const thresholds = [4, 24, 48, 72, 168, 336] // hours: green cutoff per step
    const t = thresholds[stepIndex] ?? 72
    if (h <= t * 0.25) return C.green
    if (h <= t * 0.6)  return '#78c97e'
    if (h <= t)        return C.yellow
    if (h <= t * 2)    return '#f97316'
    return C.red
  }

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>ACQ Funnel</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Acquisition pipeline, contact-level conversion tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {(['KPI', 'Net KPI'] as const).map(mode => {
              const active = (mode === 'Net KPI') === netKpi
              return (
                <button key={mode} onClick={() => setNetKpi(mode === 'Net KPI')} style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  background: active ? C.blue : 'transparent',
                  color: active ? C.white : C.dimText,
                  transition: 'all 0.15s',
                }}>{mode}</button>
              )
            })}
          </div>
          <SourcePicker value={leadSource} options={allLeadSources} onChange={setLeadSource} accentColor={C.blue} />
          <DateRangePicker
            period={period} customFrom={customFrom} customTo={customTo}
            onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* ── Rep filter pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[null, ...ACQ_REPS].map(rep => {
          const active = selectedRep === rep
          return (
            <button
              key={rep ?? '__all'}
              onClick={() => setSelectedRep(rep)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${active ? C.blue : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(48,125,192,0.18)' : 'transparent',
                color: active ? C.blue : C.mutedText,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {rep ?? 'All Reps'}
            </button>
          )
        })}
      </div>

      {/* ── Summary stat cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Leads',      value: counts['lead'] ?? 0,            sub: 'in period'                                               },
          { label: 'Appts Set',        value: counts['appointment_set'] ?? 0, sub: pct(counts['appointment_set'] ?? 0, leadCount) + ' of leads' },
          { label: 'Contracts Signed', value: counts['contract_signed'] ?? 0, sub: pct(counts['contract_signed'] ?? 0, leadCount) + ' of leads' },
          { label: 'Closed Deals',     value: counts['closed_deal'] ?? 0,     sub: pct(counts['closed_deal'] ?? 0, leadCount) + ' of leads'    },
        ].map(card => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: C.white, lineHeight: 1, marginBottom: 4 }}>{card.value}</div>
            <div style={{ fontSize: 12, color: C.bodyText }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Speed to KPI ─────────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 28px', marginBottom: 24, overflow: 'hidden', position: 'relative' }}>
        {/* background glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="#7c3aed" strokeWidth="1.2" />
                <path d="M8 4.5V8L10.5 10" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Speed to KPI</div>
              <div style={{ fontSize: 11, color: C.dimText }}>Avg time between each stage — faster is better</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[{ dot: C.green, label: 'Fast' }, { dot: C.yellow, label: 'Avg' }, { dot: C.red, label: 'Slow' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot }} />
                <span style={{ fontSize: 11, color: C.dimText }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {speedData.map((step, i) => {
            const hasData = step.avgHours != null && step.count > 0
            const avgColor = hasData ? speedColor(step.avgHours!, i) : C.dimText
            const medColor = hasData ? speedColor(step.medHours!, i) : C.dimText

            return (
              <div key={step.fromKey + step.toKey} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 12, padding: '14px 14px 12px', position: 'relative', overflow: 'hidden' }}>
                {/* top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${step.color}, transparent)`, borderRadius: '12px 12px 0 0' }} />

                {/* step connector arrow */}
                {i < speedData.length - 1 && (
                  <div style={{ position: 'absolute', top: '50%', right: -7, transform: 'translateY(-50%)', zIndex: 2, color: C.dimText, fontSize: 10, lineHeight: 1 }}>›</div>
                )}

                <div style={{ fontSize: 10, fontWeight: 700, color: step.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{step.label}</div>

                {hasData ? (
                  <>
                    {/* Avg big number */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: C.dimText, marginBottom: 2 }}>Avg</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: avgColor, lineHeight: 1 }}>{fmtHours(step.avgHours!)}</div>
                    </div>

                    {/* Median */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 9, color: C.dimText, marginBottom: 1 }}>Median</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: medColor }}>{fmtHours(step.medHours!)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 9, color: C.dimText, marginBottom: 1 }}>Contacts</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.mutedText }}>{step.count}</div>
                      </div>
                    </div>

                    {/* Speed gauge bar */}
                    {(() => {
                      const thresholds = [4, 24, 48, 72, 168, 336]
                      const maxH = (thresholds[i] ?? 72) * 2
                      const fillPct = Math.min((step.avgHours! / maxH) * 100, 100)
                      return (
                        <div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${fillPct}%`, height: '100%', background: `linear-gradient(90deg, ${avgColor}, ${avgColor}88)`, borderRadius: 2, transition: 'width 0.5s ease' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                            <span style={{ fontSize: 9, color: C.green }}>Fast</span>
                            <span style={{ fontSize: 9, color: C.red }}>Slow</span>
                          </div>
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: C.dimText, marginTop: 12 }}>No data</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Timeline strip */}
        <div style={{ marginTop: 18, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 10, color: C.dimText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>End-to-end pipeline timeline (avg)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {speedData.map((step, i) => {
              const hasData = step.avgHours != null && step.count > 0
              const col = hasData ? speedColor(step.avgHours!, i) : C.dimText
              const totalHours = speedData.reduce((s, s2) => s + (s2.avgHours ?? 0), 0)
              const widthPct   = totalHours > 0 && hasData ? Math.max((step.avgHours! / totalHours) * 100, 8) : 8
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ background: `${col}22`, border: `1px solid ${col}44`, borderRadius: 6, padding: '5px 10px', minWidth: 70, width: `${widthPct * 6}px`, maxWidth: 180, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: col, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.label.split('→')[1]?.trim()}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: col }}>{hasData ? fmtHours(step.avgHours!) : '—'}</div>
                  </div>
                  {i < speedData.length - 1 && (
                    <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0, position: 'relative' }}>
                      <div style={{ position: 'absolute', right: -3, top: -4, fontSize: 10, color: C.dimText }}>›</div>
                    </div>
                  )}
                </div>
              )
            })}
            {/* total */}
            {(() => {
              const total = speedData.reduce((s, s2) => s + (s2.avgHours ?? 0), 0)
              return total > 0 ? (
                <div style={{ marginLeft: 16, padding: '5px 12px', background: 'rgba(67,183,73,0.1)', border: `1px solid ${C.green}40`, borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>TOTAL</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{fmtHours(total)}</div>
                </div>
              ) : null
            })()}
          </div>
        </div>
      </div>

      {/* ── Pipeline Funnel ──────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 24 }}>Pipeline Funnel</div>

        {MAIN_STAGES.map((stage, i) => {
          const count    = counts[stage.key] ?? 0
          const prev     = i > 0 ? (counts[MAIN_STAGES[i - 1].key] ?? 0) : count
          const barW     = (count / leadCount) * 100
          const convFromPrev = i > 0 ? pct(count, prev) : null
          const isClose  = stage.key === 'closed_deal'
          const subItems = DROPOFFS[stage.key] ?? []

          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
                <span style={{ width: 190, flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stage.label}
                </span>
                <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: isClose ? C.green : C.blue, borderRadius: 5 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 16, fontWeight: 700, color: C.white, flexShrink: 0 }}>{count}</span>
                <span style={{ width: 75, textAlign: 'right', fontSize: 12, color: C.dimText, flexShrink: 0 }}>{pct(count, leadCount)}</span>
                <span style={{ width: 100, textAlign: 'right', fontSize: 12, flexShrink: 0, color: convFromPrev ? '#60a5fa' : 'transparent' }}>
                  {convFromPrev ? `${convFromPrev} of prev` : ''}
                </span>
              </div>

              {subItems.map(sub => {
                const sc  = counts[sub.key] ?? 0
                const subW = count > 0 ? (sc / count) * 100 : 0
                return (
                  <div key={sub.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 4px 28px' }}>
                    <span style={{ width: 162, flexShrink: 0, fontSize: 11, color: C.dimText }}>{sub.label}</span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${subW}%`, height: '100%', background: sub.color, opacity: 0.7, borderRadius: 2 }} />
                    </div>
                    <span style={{ width: 40, textAlign: 'right', fontSize: 12, color: C.bodyText, flexShrink: 0 }}>{sc}</span>
                    <span style={{ width: 75, textAlign: 'right', fontSize: 11, color: C.dimText, flexShrink: 0 }}>{pct(sc, count)} of stage</span>
                    <span style={{ width: 100, flexShrink: 0 }} />
                  </div>
                )
              })}

              {i < MAIN_STAGES.length - 1 && (
                <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Key Ratios (6 sequential) ────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 4 }}>Key Conversion Ratios</div>
        <div style={{ fontSize: 12, color: C.dimText, marginBottom: 20 }}>Sequential step-to-step rates</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {KEY_RATIOS.map(r => {
            const data = allRatios[`${r.from}→${r.to}`]
            const color = ratioColor(data?.pct)
            return (
              <div key={r.label} style={{ background: '#0b1929', border: `1px solid rgba(48,125,192,0.1)`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: C.dimText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
                  {data ? data.pct.toFixed(1) + '%' : '0%'}
                </div>
                {data && (
                  <div style={{ fontSize: 10, color: C.dimText, marginTop: 4 }}>
                    {data.to} of {data.from}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Funnel Stage Bar Chart ──────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 20 }}>Stage Volume</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          {MAIN_STAGES.map((stage) => {
            const count = counts[stage.key] ?? 0
            const maxCount = Math.max(counts['lead'] ?? 1, 1)
            const barH = Math.max((count / maxCount) * 130, count > 0 ? 3 : 0)
            const isClose = stage.key === 'closed_deal'
            return (
              <div key={stage.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.white, marginBottom: 4 }}>{count}</span>
                <div style={{ width: '100%', maxWidth: 52, height: barH, background: isClose ? C.green : C.blue, borderRadius: '4px 4px 0 0', opacity: 0.9 }} />
              </div>
            )
          })}
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {MAIN_STAGES.map(stage => (
            <div key={stage.key} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: C.dimText, lineHeight: 1.3 }}>
              {stage.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Full 56-Ratio Conversion Matrix ─────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bd}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Full Conversion Matrix</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 980 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {/* Sticky from-label header */}
                <th style={{
                  width: 148, padding: '10px 16px', textAlign: 'left',
                  position: 'sticky', left: 0, background: C.card, zIndex: 2,
                  fontSize: 10, color: C.dimText, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  borderRight: `1px solid ${bd}`,
                }}>
                  From / To
                </th>
                {MATRIX_COLS.map(col => (
                  <th key={col.key} style={{
                    width: 70, padding: '10px 4px', textAlign: 'center',
                    fontSize: 10, color: C.dimText, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    whiteSpace: 'nowrap', borderLeft: `1px solid rgba(255,255,255,0.04)`,
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row, ri) => (
                <tr key={row.key} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                  {/* Sticky row label */}
                  <td style={{
                    padding: '9px 16px',
                    position: 'sticky', left: 0, background: C.card, zIndex: 1,
                    fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap',
                    borderRight: `1px solid ${bd}`,
                  }}>
                    {row.label}
                  </td>

                  {MATRIX_COLS.map(col => {
                    const k = `${row.key}→${col.key}`
                    const isOverall = row.key === 'lead' && col.key === 'closed_deal'

                    if (!row.valid.has(col.key)) {
                      return (
                        <td key={col.key} style={{
                          width: 70, background: 'rgba(255,255,255,0.015)',
                          borderLeft: `1px solid rgba(255,255,255,0.04)`,
                        }} />
                      )
                    }

                    const data  = allRatios[k]
                    const color = isOverall ? C.green : ratioColor(data?.pct)

                    return (
                      <td key={col.key} style={{
                        width: 70, padding: '8px 4px', textAlign: 'center',
                        borderLeft: `1px solid rgba(255,255,255,0.04)`,
                        background: isOverall ? 'rgba(67,183,73,0.06)' : undefined,
                        outline: isOverall ? `1px solid rgba(67,183,73,0.25)` : undefined,
                      }}>
                        {data ? (
                          <>
                            <div style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1 }}>
                              {data.pct > 0 ? data.pct.toFixed(1) + '%' : '0%'}
                            </div>
                            <div style={{ fontSize: 9, color: C.dimText, marginTop: 3, lineHeight: 1 }}>
                              {data.to}/{data.from}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.1)' }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ padding: '12px 24px', borderTop: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 11, color: C.dimText, fontWeight: 600 }}>Color scale:</span>
          {[
            { label: '≥80%', color: C.green },
            { label: '60–79%', color: '#78c97e' },
            { label: '40–59%', color: C.yellow },
            { label: '20–39%', color: '#f59e0b' },
            { label: '<20%',  color: C.red },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 11, color: C.dimText }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rep breakdown table ──────────────────────────────────── */}
      {repRows.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Rep Breakdown</span>
            {totalProfit > 0 && (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                ${(totalProfit / 1000).toFixed(0)}K total potential profit
              </span>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['Rep', 'Leads', 'Appt Set For', 'Appt Set By', 'Appts Held', 'Offers', 'Contracts', 'Closed', 'Lead to Close'].map(h => (
                    <th key={h} style={{
                      padding: '10px 20px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: C.dimText,
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxLeads  = Math.max(...repRows.map(r => r.leads),  1)
                  const maxClosed = Math.max(...repRows.map(r => r.closed), 1)
                  const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
                  const avatarPalette = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22']
                  return repRows.map((rep, i) => {
                    const convNum   = parseFloat(rep.conv)
                    const convColor = convNum >= 10 ? C.green : convNum >= 5 ? C.yellow : C.red
                    const rankColor = rankColors[i] ?? C.dimText
                    const rankBg    = i < 3 ? `rgba(${i===0?'255,215,0':i===1?'192,192,192':'205,127,50'},0.12)` : 'rgba(255,255,255,0.04)'
                    const initials  = rep.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
                    const avBg      = avatarPalette[i % avatarPalette.length]
                    return (
                      <tr key={rep.name} style={{ borderBottom: i < repRows.length - 1 ? `1px solid ${bd}` : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: rankBg, border: `1.5px solid ${rankColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: rankColor, flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${avBg}, ${avBg}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.white, flexShrink: 0 }}>{initials}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{rep.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{rep.leads}</span>
                            <div style={{ height: 3, width: 64, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                              <div style={{ width: `${(rep.leads / maxLeads) * 100}%`, height: '100%', background: C.blue, borderRadius: 2 }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: C.blue, fontWeight: 600 }}>{rep.apptSetFor}</td>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: C.yellow, fontWeight: 600 }}>{rep.apptSetBy}</td>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.apptHeld}</td>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.offers}</td>
                        <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.signed}</td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: rep.closed > 0 ? 700 : 400, color: rep.closed > 0 ? C.green : C.mutedText }}>{rep.closed}</span>
                            {rep.closed > 0 && (
                              <div style={{ height: 3, width: 64, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                                <div style={{ width: `${(rep.closed / maxClosed) * 100}%`, height: '100%', background: C.green, borderRadius: 2 }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: `${convColor}18`, color: convColor, border: `1px solid ${convColor}40` }}>{rep.conv}</span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Performance Metrics ──────────────────────────────────── */}
      {perfRows.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', marginTop: 24, marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Agent Performance Metrics</span>
            <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>activity aggregated across calls and SMS in selected period</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['Agent Name', 'Talk Time', 'Total Calls', 'Unique Leads', 'SMS Sent', 'Avg Duration'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: h === 'Agent Name' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxTalk  = Math.max(...perfRows.map(r => r.talkSec),    1)
                  const maxCalls = Math.max(...perfRows.map(r => r.totalCalls), 1)
                  const maxLeads = Math.max(...perfRows.map(r => r.uniqueLeads),1)
                  return perfRows.map((row, i) => (
                    <tr key={row.agent} style={{ borderBottom: i < perfRows.length - 1 ? `1px solid ${bd}` : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{row.agent}</td>
                      <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontSize: 13, color: C.blue, fontWeight: 600 }}>{fmtTalkTime(row.talkSec)}</span>
                          <div style={{ height: 3, width: 64, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                            <div style={{ width: `${(row.talkSec / maxTalk) * 100}%`, height: '100%', background: C.blue, borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontSize: 13, color: C.text }}>{row.totalCalls.toLocaleString()}</span>
                          <div style={{ height: 3, width: 64, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                            <div style={{ width: `${(row.totalCalls / maxCalls) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{row.uniqueLeads.toLocaleString()}</span>
                          <div style={{ height: 3, width: 64, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                            <div style={{ width: `${(row.uniqueLeads / maxLeads) * 100}%`, height: '100%', background: C.green, borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 13, color: C.yellow, fontWeight: 600 }}>{row.smsSent.toLocaleString()}</td>
                      <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 13, color: C.dimText }}>{fmtAvgDuration(row.avgDurSec)}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACQ Positive KPI Matrix ───────────────────────────────── */}
      {matrixAgents.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>ACQ Positive KPIs</span>
            <span style={{ fontSize: 11, color: C.dimText }}>count per agent per positive KPI stage</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  <th style={{ width: 160, padding: '10px 20px', textAlign: 'left', position: 'sticky', left: 0, background: C.card, zIndex: 2, fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${bd}` }}>Agent</th>
                  {POSITIVE_KPIS.map(k => (
                    <th key={k.key} style={{ width: 90, padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', borderLeft: `1px solid rgba(255,255,255,0.04)` }}>{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixAgents.map((agent, ri) => (
                  <tr key={agent} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 20px', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', borderRight: `1px solid ${bd}` }}>{agent}</td>
                    {POSITIVE_KPIS.map(k => {
                      const count = agentKpiMatrix.get(agent)?.get(k.key) ?? 0
                      const max   = posKpiMaxes.get(k.key) ?? 1
                      const intensity = max > 0 ? count / max : 0
                      return (
                        <td key={k.key} style={{ width: 90, padding: '9px 6px', textAlign: 'center', borderLeft: `1px solid rgba(255,255,255,0.04)`, background: count > 0 ? `rgba(67,183,73,${(intensity * 0.22).toFixed(2)})` : undefined, transition: 'background 0.2s' }}>
                          <span style={{ fontSize: 13, fontWeight: count > 0 ? 700 : 400, color: count > 0 ? C.green : C.dimText }}>{count > 0 ? count : '—'}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACQ Negative KPI Matrix ───────────────────────────────── */}
      {matrixAgents.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>ACQ Negative KPIs</span>
            <span style={{ fontSize: 11, color: C.dimText }}>count per agent per negative KPI stage</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  <th style={{ width: 160, padding: '10px 20px', textAlign: 'left', position: 'sticky', left: 0, background: C.card, zIndex: 2, fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${bd}` }}>Agent</th>
                  {NEGATIVE_KPIS.map(k => (
                    <th key={k.key} style={{ width: 90, padding: '10px 6px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', borderLeft: `1px solid rgba(255,255,255,0.04)` }}>{k.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixAgents.map((agent) => (
                  <tr key={agent} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 20px', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', borderRight: `1px solid ${bd}` }}>{agent}</td>
                    {NEGATIVE_KPIS.map(k => {
                      const count = agentKpiMatrix.get(agent)?.get(k.key) ?? 0
                      const max   = negKpiMaxes.get(k.key) ?? 1
                      const intensity = max > 0 ? count / max : 0
                      return (
                        <td key={k.key} style={{ width: 90, padding: '9px 6px', textAlign: 'center', borderLeft: `1px solid rgba(255,255,255,0.04)`, background: count > 0 ? `rgba(237,31,36,${(intensity * 0.2).toFixed(2)})` : undefined, transition: 'background 0.2s' }}>
                          <span style={{ fontSize: 13, fontWeight: count > 0 ? 700 : 400, color: count > 0 ? C.red : C.dimText }}>{count > 0 ? count : '—'}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Qualification Status per Lead Source ──────────────── */}
      <div style={{ marginTop: 32, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Qualification Status per Lead Source</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Lead Source</th>
                {QUAL_COLS.map(q => (
                  <th key={q} style={{ textAlign: 'right', padding: '8px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, minWidth: 100 }}>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {[...qualBySource.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([src, qmap], idx) => {
                const total = [...qmap.values()].reduce((s, v) => s + v, 0)
                return (
                  <tr key={src} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '8px 12px', color: C.white, whiteSpace: 'nowrap' }}>{src}</td>
                    {QUAL_COLS.map(q => (
                      <td key={q} style={{ padding: '8px 12px', textAlign: 'right', color: (qmap.get(q) ?? 0) > 0 ? QUAL_COLORS[q] : C.dimText, fontWeight: (qmap.get(q) ?? 0) > 0 ? 600 : 400 }}>
                        {qmap.get(q) ?? 0}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: C.mutedText, fontWeight: 600 }}>{total}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {total > 0 && (
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', minWidth: 90 }}>
                          {QUAL_COLS.map(qk => { const pct = total > 0 ? ((qmap.get(qk) ?? 0) / total) * 100 : 0; return pct > 0 ? <div key={qk} style={{ width: `${pct}%`, background: QUAL_COLORS[qk] }} title={`${qk}: ${Math.round(pct)}%`} /> : null })}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Qualification Status per Stage (Regular) ──────────── */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Qualification Status per Stage</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Stage</th>
                {QUAL_COLS.map(q => (
                  <th key={q} style={{ textAlign: 'right', padding: '8px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, minWidth: 100 }}>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {REGULAR_STAGES.map((stage, idx) => {
                const qmap = qualByRegularStage.get(stage)
                if (!qmap) return null
                const total = [...qmap.values()].reduce((s, v) => s + v, 0)
                return (
                  <tr key={stage} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '8px 12px', color: C.white, whiteSpace: 'nowrap' }}>{stage}</td>
                    {QUAL_COLS.map(q => (
                      <td key={q} style={{ padding: '8px 12px', textAlign: 'right', color: (qmap.get(q) ?? 0) > 0 ? QUAL_COLORS[q] : C.dimText, fontWeight: (qmap.get(q) ?? 0) > 0 ? 600 : 400 }}>
                        {qmap.get(q) ?? 0}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: C.mutedText, fontWeight: 600 }}>{total}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {total > 0 && (
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', minWidth: 90 }}>
                          {QUAL_COLS.map(qk => { const pct = total > 0 ? ((qmap.get(qk) ?? 0) / total) * 100 : 0; return pct > 0 ? <div key={qk} style={{ width: `${pct}%`, background: QUAL_COLORS[qk] }} title={`${qk}: ${Math.round(pct)}%`} /> : null })}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Qualification Status per Stage (VIP) ─────────────── */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Qualification Status per Stage (VIP)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Stage</th>
                {QUAL_COLS.map(q => (
                  <th key={q} style={{ textAlign: 'right', padding: '8px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, minWidth: 100 }}>Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {VIP_STAGES.map((stage, idx) => {
                const qmap = qualByVipStage.get(stage)
                if (!qmap) return null
                const total = [...qmap.values()].reduce((s, v) => s + v, 0)
                return (
                  <tr key={stage} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '8px 12px', color: C.white, whiteSpace: 'nowrap' }}>{stage}</td>
                    {QUAL_COLS.map(q => (
                      <td key={q} style={{ padding: '8px 12px', textAlign: 'right', color: (qmap.get(q) ?? 0) > 0 ? QUAL_COLORS[q] : C.dimText, fontWeight: (qmap.get(q) ?? 0) > 0 ? 600 : 400 }}>
                        {qmap.get(q) ?? 0}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: C.mutedText, fontWeight: 600 }}>{total}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {total > 0 && (
                        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', minWidth: 90 }}>
                          {QUAL_COLS.map(qk => { const pct = total > 0 ? ((qmap.get(qk) ?? 0) / total) * 100 : 0; return pct > 0 ? <div key={qk} style={{ width: `${pct}%`, background: QUAL_COLORS[qk] }} title={`${qk}: ${Math.round(pct)}%`} /> : null })}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lead Source × Agent × Qualification Status ────────── */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Lead Source per Qualification Date</div>
        {[...qualBySourceAgent.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([src, agentMap]) => (
          <div key={src} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{src}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '7px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Agent</th>
                    {QUAL_COLS.map(q => (
                      <th key={q} style={{ textAlign: 'right', padding: '7px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                    ))}
                    <th style={{ textAlign: 'right', padding: '7px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
                    <th style={{ textAlign: 'left', padding: '7px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, minWidth: 90 }}>Breakdown</th>
                  </tr>
                </thead>
                <tbody>
                  {[...agentMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([agent, qmap], idx) => {
                    const total = [...qmap.values()].reduce((s, v) => s + v, 0)
                    return (
                      <tr key={agent} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '7px 12px', color: C.white, whiteSpace: 'nowrap' }}>{agent}</td>
                        {QUAL_COLS.map(q => (
                          <td key={q} style={{ padding: '7px 12px', textAlign: 'right', color: (qmap.get(q) ?? 0) > 0 ? QUAL_COLORS[q] : C.dimText, fontWeight: (qmap.get(q) ?? 0) > 0 ? 600 : 400 }}>
                            {qmap.get(q) ?? 0}
                          </td>
                        ))}
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: C.mutedText, fontWeight: 600 }}>{total}</td>
                        <td style={{ padding: '7px 12px' }}>
                          {total > 0 && (
                            <div style={{ display: 'flex', height: 7, borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
                              {QUAL_COLS.map(qk => { const pct = total > 0 ? ((qmap.get(qk) ?? 0) / total) * 100 : 0; return pct > 0 ? <div key={qk} style={{ width: `${pct}%`, background: QUAL_COLORS[qk] }} title={`${qk}: ${Math.round(pct)}%`} /> : null })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <span style={{
          fontSize: 11, color: C.dimText, background: 'rgba(252,175,23,0.07)',
          border: '1px solid rgba(252,175,23,0.15)', borderRadius: 6,
          padding: '5px 12px', letterSpacing: '0.04em',
        }}>
          MOCKUP - dummy data, replace with Supabase query in Milestone 2
        </span>
      </div>
    </div>
  )
}
