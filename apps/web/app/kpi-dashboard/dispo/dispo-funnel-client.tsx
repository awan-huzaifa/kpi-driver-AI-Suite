'use client'

import { useState, useMemo } from 'react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS, DISPO_STAGES, type DummyKpiEvent } from '../dummy-data'
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

function ratioColor(val: number | null | undefined): string {
  if (val == null) return C.dimText
  if (val >= 80) return C.green
  if (val >= 60) return '#78c97e'
  if (val >= 40) return C.yellow
  if (val >= 20) return '#f59e0b'
  if (val >   0) return C.red
  return C.dimText
}

// ── funnel config ─────────────────────────────────────────────────────────────

const DISPO_REPS = ['Lisa Park', 'Tom Wilson', 'Kevin Nguyen', 'Rachel Foster', 'Marcus Bell', 'Diana Ortiz', 'Jason Tran']

const MAIN_STAGES = [
  { key: 'lead',                  label: 'Lead'                   },
  { key: 'lead_assigned',         label: 'Lead Assigned'          },
  { key: 'interested',            label: 'Interested'             },
  { key: 'showing_requested',     label: 'Showing Requested'      },
  { key: 'showing_set',           label: 'Showing Set'            },
  { key: 'showing_held',          label: 'Showing Held'           },
  { key: 'offer_received',        label: 'Offer Received'         },
  { key: 'contract_sent_received',label: 'Contract Sent/Received' },
  { key: 'contract_signed',       label: 'Contract Signed'        },
  { key: 'closed_deal',           label: 'Closed Deal'            },
]

const DROPOFFS: Record<string, { key: string; label: string; color: string }[]> = {
  showing_set: [
    { key: 'no_show',          label: 'No Show',          color: C.red     },
    { key: 'showing_cancelled',label: 'Showing Cancelled',color: '#64748b' },
  ],
  offer_received: [
    { key: 'offer_rejected', label: 'Offer Rejected', color: C.red },
  ],
  contract_sent_received: [
    { key: 'contract_rejected', label: 'Contract Rejected', color: C.red },
  ],
  contract_signed: [
    { key: 'contract_signed_owned_rentals', label: 'Owned & Rentals', color: C.blue },
  ],
  closed_deal: [
    { key: 'cancelled_deal',           label: 'Cancelled Deal',          color: C.red  },
    { key: 'closed_deal_owned_rentals',label: 'Closed (Owned & Rentals)',color: C.blue },
  ],
}

// ── key ratios (6 sequential) ─────────────────────────────────────────────────

const KEY_RATIOS = [
  { from: 'lead',             to: 'showing_set',      label: 'Lead to Showing Set'      },
  { from: 'showing_set',      to: 'showing_held',     label: 'Showing Set to Held'      },
  { from: 'showing_held',     to: 'offer_received',   label: 'Held to Offer'            },
  { from: 'offer_received',   to: 'contract_signed',  label: 'Offer to Contract Signed' },
  { from: 'contract_signed',  to: 'closed_deal',      label: 'Signed to Closed'         },
  { from: 'lead',             to: 'closed_deal',      label: 'Lead to Closed'           },
]

// ── full 77-ratio matrix (CSV-exact) ─────────────────────────────────────────

const MATRIX_COLS = [
  { key: 'interested',             label: 'Interested'      },
  { key: 'showing_requested',      label: 'Show. Req.'      },
  { key: 'showing_set',            label: 'Show. Set'       },
  { key: 'showing_held',           label: 'Show. Held'      },
  { key: 'showing_cancelled',      label: 'Show. Cancel'    },
  { key: 'offer_received',         label: 'Offer Recv.'     },
  { key: 'offer_rejected',         label: 'Offer Rej.'      },
  { key: 'contract_sent_received', label: 'Cont. Sent'      },
  { key: 'contract_signed',        label: 'Signed'          },
  { key: 'contract_rejected',      label: 'Cont. Rej.'      },
  { key: 'closed_deal',            label: 'Closed'          },
  { key: 'cancelled_deal',         label: 'Cancelled'       },
]

const MATRIX_ROWS: { key: string; label: string; valid: Set<string> }[] = [
  { key: 'lead',                  label: 'Lead',            valid: new Set(['interested','showing_requested','showing_set','showing_held','showing_cancelled','offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'interested',            label: 'Interested',      valid: new Set(['showing_requested','showing_set','showing_held','showing_cancelled','offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'showing_requested',     label: 'Show. Requested', valid: new Set(['showing_set','showing_held','showing_cancelled','offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'showing_set',           label: 'Show. Set',       valid: new Set(['showing_held','showing_cancelled','offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'showing_held',          label: 'Show. Held',      valid: new Set(['offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'showing_cancelled',     label: 'Show. Cancelled', valid: new Set(['offer_received','offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'offer_received',        label: 'Offer Received',  valid: new Set(['offer_rejected','contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'offer_rejected',        label: 'Offer Rejected',  valid: new Set(['contract_sent_received','contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'contract_sent_received',label: 'Cont. Sent/Recv.',valid: new Set(['contract_signed','contract_rejected','closed_deal','cancelled_deal']) },
  { key: 'contract_rejected',     label: 'Cont. Rejected',  valid: new Set(['contract_signed','closed_deal','cancelled_deal']) },
  { key: 'contract_signed',       label: 'Cont. Signed',    valid: new Set(['closed_deal','cancelled_deal']) },
  { key: 'closed_deal',           label: 'Closed Deal',     valid: new Set(['cancelled_deal']) },
]

// ── DISPO positive / negative KPI sets ───────────────────────────────────────

const DISPO_POSITIVE_KPIS = [
  { key: 'lead_assigned',          label: 'Lead Assigned'   },
  { key: 'interested',             label: 'Interested'      },
  { key: 'showing_set',            label: 'Showing Set'     },
  { key: 'showing_held',           label: 'Showing Held'    },
  { key: 'offer_received',         label: 'Offer Received'  },
  { key: 'contract_sent_received', label: 'Contract Sent'   },
  { key: 'contract_signed',        label: 'Signed'          },
  { key: 'closed_deal',            label: 'Closed'          },
]

const DISPO_NEGATIVE_KPIS = [
  { key: 'no_show',            label: 'No Show'          },
  { key: 'showing_cancelled',  label: 'Show. Cancelled'  },
  { key: 'offer_rejected',     label: 'Offer Rejected'   },
  { key: 'contract_rejected',  label: 'Contract Rej.'    },
  { key: 'cancelled_deal',     label: 'Cancelled Deal'   },
]

// DISPO sources that are "potential buyer" sources
const BUYER_SOURCES = new Set(['SEO', 'Inbound Buyer', 'PPL', 'DM', 'Listed'])

// ── main ──────────────────────────────────────────────────────────────────────

type RatioData = { pct: number; from: number; to: number }

export default function DispoFunnelClient() {
  const [period,      setPeriod]      = useState<DatePeriod>('30d')
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [selectedRep, setSelectedRep] = useState<string | null>(null)
  const [leadSource,  setLeadSource]  = useState('')

  const allLeadSources = useMemo(() =>
    [...new Set(DUMMY_EVENTS.filter(e => e.kpi_type === 'DISPO' && e.kpi_name === 'lead').map(e => e.lead_source))].sort()
  , [])

  const filtered = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (e.kpi_type !== 'DISPO') return false
      if (selectedRep && e.user_name !== selectedRep) return false
      if (leadSource  && e.lead_source !== leadSource) return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo, selectedRep, leadSource])

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

  // All 77 conversion ratios — contact-intersection computation
  const allRatios = useMemo(() => {
    const result: Record<string, RatioData | null> = {}
    for (const row of MATRIX_ROWS) {
      const fromSet = new Set(filtered.filter(e => e.kpi_name === row.key).map(e => e.contact_id))
      for (const col of MATRIX_COLS) {
        const k = `${row.key}|${col.key}`
        if (!row.valid.has(col.key) || fromSet.size === 0) { result[k] = null; continue }
        const toSet = new Set(
          filtered.filter(e => e.kpi_name === col.key && fromSet.has(e.contact_id)).map(e => e.contact_id)
        )
        result[k] = { pct: (toSet.size / fromSet.size) * 100, from: fromSet.size, to: toSet.size }
      }
    }
    return result
  }, [filtered])

  const repRows = useMemo(() => {
    type R = { leads: Set<string>; interested: Set<string>; showingSet: Set<string>; showingHeld: Set<string>; offers: Set<string>; closed: Set<string> }
    const map = new Map<string, R>()
    for (const e of filtered) {
      if (!map.has(e.user_name)) map.set(e.user_name, { leads: new Set(), interested: new Set(), showingSet: new Set(), showingHeld: new Set(), offers: new Set(), closed: new Set() })
      const r = map.get(e.user_name)!
      if (e.kpi_name === 'lead')           r.leads.add(e.contact_id)
      if (e.kpi_name === 'interested')     r.interested.add(e.contact_id)
      if (e.kpi_name === 'showing_set')    r.showingSet.add(e.contact_id)
      if (e.kpi_name === 'showing_held')   r.showingHeld.add(e.contact_id)
      if (e.kpi_name === 'offer_received') r.offers.add(e.contact_id)
      if (e.kpi_name === 'closed_deal')    r.closed.add(e.contact_id)
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        leads:       d.leads.size,
        interested:  d.interested.size,
        showingSet:  d.showingSet.size,
        showingHeld: d.showingHeld.size,
        offers:      d.offers.size,
        closed:      d.closed.size,
        conv:        d.leads.size > 0 ? (d.closed.size / d.leads.size * 100).toFixed(1) + '%' : '0%',
      }))
      .sort((a, b) => b.closed - a.closed || b.leads - a.leads)
  }, [filtered])

  // ── per-agent KPI matrix ─────────────────────────────────────────────────────

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

  // ── qualification useMemos (lead events only) ─────────────────────────────

  const leadEvents = useMemo(() =>
    filtered.filter(e => e.kpi_name === 'lead' && e.quality != null)
  , [filtered])

  const qualBySource = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of leadEvents) {
      const q = e.quality!
      if (!map.has(e.lead_source)) map.set(e.lead_source, new Map())
      map.get(e.lead_source)!.set(q, (map.get(e.lead_source)!.get(q) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  const qualByDispoStage = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of leadEvents) {
      if (!e.stage || !(DISPO_STAGES as readonly string[]).includes(e.stage)) continue
      const q = e.quality!
      if (!map.has(e.stage)) map.set(e.stage, new Map())
      map.get(e.stage)!.set(q, (map.get(e.stage)!.get(q) ?? 0) + 1)
    }
    return map
  }, [leadEvents])

  const qualByBuyerSourceAgent = useMemo(() => {
    const map = new Map<string, Map<string, Map<string, number>>>()
    for (const e of leadEvents) {
      if (!BUYER_SOURCES.has(e.lead_source)) continue
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

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>DISPO Funnel</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Disposition pipeline, contact-level conversion tracking</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <SourcePicker value={leadSource} options={allLeadSources} onChange={setLeadSource} accentColor={C.yellow} />
          <DateRangePicker
            period={period} customFrom={customFrom} customTo={customTo}
            onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* ── Rep filter pills ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[null, ...DISPO_REPS].map(rep => {
          const active = selectedRep === rep
          return (
            <button
              key={rep ?? '__all'}
              onClick={() => setSelectedRep(rep)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                border: `1px solid ${active ? C.yellow : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(252,175,23,0.15)' : 'transparent',
                color: active ? C.yellow : C.mutedText,
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
          { label: 'Total Leads',      value: counts['lead'] ?? 0,            sub: 'in period'                                                     },
          { label: 'Showings Set',     value: counts['showing_set'] ?? 0,     sub: pct(counts['showing_set'] ?? 0, leadCount) + ' of leads'         },
          { label: 'Contracts Signed', value: counts['contract_signed'] ?? 0, sub: pct(counts['contract_signed'] ?? 0, leadCount) + ' of leads'     },
          { label: 'Closed Deals',     value: counts['closed_deal'] ?? 0,     sub: pct(counts['closed_deal'] ?? 0, leadCount) + ' of leads'          },
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

      {/* ── Pipeline Funnel ──────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 24 }}>Pipeline Funnel</div>

        {MAIN_STAGES.map((stage, i) => {
          const count        = counts[stage.key] ?? 0
          const prev         = i > 0 ? (counts[MAIN_STAGES[i - 1].key] ?? 0) : count
          const barW         = (count / leadCount) * 100
          const convFromPrev = i > 0 ? pct(count, prev) : null
          const isClose      = stage.key === 'closed_deal'
          const subItems     = DROPOFFS[stage.key] ?? []

          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0' }}>
                <span style={{ width: 200, flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stage.label}
                </span>
                <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${barW}%`, height: '100%', background: isClose ? C.green : C.yellow, borderRadius: 5 }} />
                </div>
                <span style={{ width: 40, textAlign: 'right', fontSize: 16, fontWeight: 700, color: C.white, flexShrink: 0 }}>{count}</span>
                <span style={{ width: 75, textAlign: 'right', fontSize: 12, color: C.dimText, flexShrink: 0 }}>{pct(count, leadCount)}</span>
                <span style={{ width: 100, textAlign: 'right', fontSize: 12, flexShrink: 0, color: convFromPrev ? '#fcd34d' : 'transparent' }}>
                  {convFromPrev ? `${convFromPrev} of prev` : ''}
                </span>
              </div>

              {subItems.map(sub => {
                const sc   = counts[sub.key] ?? 0
                const subW = count > 0 ? (sc / count) * 100 : 0
                return (
                  <div key={sub.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 4px 28px' }}>
                    <span style={{ width: 172, flexShrink: 0, fontSize: 11, color: C.dimText }}>{sub.label}</span>
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
            const data  = allRatios[`${r.from}|${r.to}`]
            const color = ratioColor(data?.pct)
            return (
              <div key={r.label} style={{ background: '#0b1929', border: `1px solid rgba(252,175,23,0.1)`, borderRadius: 10, padding: '14px 16px' }}>
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

      {/* ── Full 77-Ratio Conversion Matrix ─────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${bd}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Full Conversion Matrix</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1020 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
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
                    width: 72, padding: '10px 4px', textAlign: 'center',
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
              {MATRIX_ROWS.map(row => (
                <tr key={row.key} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{
                    padding: '9px 16px',
                    position: 'sticky', left: 0, background: C.card, zIndex: 1,
                    fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap',
                    borderRight: `1px solid ${bd}`,
                  }}>
                    {row.label}
                  </td>

                  {MATRIX_COLS.map(col => {
                    const k         = `${row.key}|${col.key}`
                    const isOverall = row.key === 'lead' && col.key === 'closed_deal'

                    if (!row.valid.has(col.key)) {
                      return (
                        <td key={col.key} style={{
                          width: 72, background: 'rgba(255,255,255,0.015)',
                          borderLeft: `1px solid rgba(255,255,255,0.04)`,
                        }} />
                      )
                    }

                    const data  = allRatios[k]
                    const color = isOverall ? C.green : ratioColor(data?.pct)

                    return (
                      <td key={col.key} style={{
                        width: 72, padding: '8px 4px', textAlign: 'center',
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
            { label: '80%+',   color: C.green   },
            { label: '60-79%', color: '#78c97e' },
            { label: '40-59%', color: C.yellow  },
            { label: '20-39%', color: '#f59e0b' },
            { label: 'Under 20%', color: C.red  },
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
                  {['Rep', 'Leads', 'Interested', 'Showings Set', 'Showings Held', 'Offers', 'Closed', 'Lead to Close'].map(h => (
                    <th key={h} style={{
                      padding: '10px 20px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: C.dimText,
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repRows.map((rep, i) => (
                  <tr key={rep.name} style={{ borderBottom: i < repRows.length - 1 ? `1px solid ${bd}` : undefined }}>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{rep.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.leads}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.interested}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.showingSet}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.showingHeld}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.text }}>{rep.offers}</td>
                    <td style={{ padding: '12px 20px', fontSize: 14, fontWeight: rep.closed > 0 ? 700 : 400, color: rep.closed > 0 ? C.green : C.mutedText }}>
                      {rep.closed}
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 14, color: C.mutedText }}>{rep.conv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DISPO Positive KPI Matrix ────────────────────────────── */}
      {matrixAgents.length > 0 && (
        <div style={{ marginTop: 32, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>DISPO Positive KPIs</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  <th style={{ width: 160, padding: '10px 16px', textAlign: 'left', position: 'sticky', left: 0, background: C.card, zIndex: 2, fontSize: 10, color: C.dimText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${bd}` }}>
                    Agent
                  </th>
                  {DISPO_POSITIVE_KPIS.map(k => (
                    <th key={k.key} style={{ width: 90, padding: '10px 8px', textAlign: 'center', fontSize: 10, color: C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', borderLeft: `1px solid rgba(255,255,255,0.04)` }}>
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixAgents.map(agent => {
                  const kmap = agentKpiMatrix.get(agent)
                  return (
                    <tr key={agent} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                      <td style={{ padding: '9px 16px', position: 'sticky', left: 0, background: C.card, zIndex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', borderRight: `1px solid ${bd}` }}>
                        {agent}
                      </td>
                      {DISPO_POSITIVE_KPIS.map(k => {
                        const count = kmap?.get(k.key) ?? 0
                        return (
                          <td key={k.key} style={{ padding: '9px 8px', textAlign: 'center', fontSize: 13, fontWeight: count > 0 ? 700 : 400, color: count > 0 ? C.green : C.dimText, borderLeft: `1px solid rgba(255,255,255,0.04)` }}>
                            {count > 0 ? count : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DISPO Negative KPI Matrix ────────────────────────────── */}
      {matrixAgents.length > 0 && (
        <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.white }}>DISPO Negative KPIs</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  <th style={{ width: 160, padding: '10px 16px', textAlign: 'left', position: 'sticky', left: 0, background: C.card, zIndex: 2, fontSize: 10, color: C.dimText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: `1px solid ${bd}` }}>
                    Agent
                  </th>
                  {DISPO_NEGATIVE_KPIS.map(k => (
                    <th key={k.key} style={{ width: 110, padding: '10px 8px', textAlign: 'center', fontSize: 10, color: C.red, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', borderLeft: `1px solid rgba(255,255,255,0.04)` }}>
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixAgents.map(agent => {
                  const kmap = agentKpiMatrix.get(agent)
                  return (
                    <tr key={agent} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                      <td style={{ padding: '9px 16px', position: 'sticky', left: 0, background: C.card, zIndex: 1, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', borderRight: `1px solid ${bd}` }}>
                        {agent}
                      </td>
                      {DISPO_NEGATIVE_KPIS.map(k => {
                        const count = kmap?.get(k.key) ?? 0
                        return (
                          <td key={k.key} style={{ padding: '9px 8px', textAlign: 'center', fontSize: 13, fontWeight: count > 0 ? 700 : 400, color: count > 0 ? C.red : C.dimText, borderLeft: `1px solid rgba(255,255,255,0.04)` }}>
                            {count > 0 ? count : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Qualification Status per Potential Buyer Source ──────── */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Status per Potential Buyer Source</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Source</th>
                {QUAL_COLS.map(q => (
                  <th key={q} style={{ textAlign: 'right', padding: '8px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '8px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Qualification Status per Stage (DISPO) ───────────────── */}
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
              </tr>
            </thead>
            <tbody>
              {DISPO_STAGES.map((stage, idx) => {
                const qmap = qualByDispoStage.get(stage)
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Potential Buyer Source × Agent × Qualification Status ─── */}
      <div style={{ marginTop: 24, background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 16 }}>Potential Buyer Source per Qualification Date</div>
        {[...qualByBuyerSourceAgent.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([src, agentMap]) => (
          <div key={src} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{src}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '7px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>Agent</th>
                    {QUAL_COLS.map(q => (
                      <th key={q} style={{ textAlign: 'right', padding: '7px 12px', color: QUAL_COLORS[q], fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{q}</th>
                    ))}
                    <th style={{ textAlign: 'right', padding: '7px 12px', color: C.mutedText, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${bd}` }}>Total</th>
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
