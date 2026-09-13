'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS, DUMMY_CALLER_SESSIONS } from '../dummy-data'

const NOW    = Date.now()
const DAY_MS = 86_400_000

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTalkTime(sec: number): string {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const KPI_LABELS: Record<string, string> = {
  lead:                       'Lead',
  lead_assigned:              'Lead Assigned',
  live_transfer_successful:   'Live Transfer ✓',
  live_transfer_unsuccessful: 'Live Transfer ✗',
  appointment_set:            'Appointment Set',
  no_show:                    'No Show',
  appointment_cancelled:      'Appointment Cancelled',
  appointment_held:           'Appointment Held',
  offer_made:                 'Offer Made',
  rejected_offer:             'Offer Rejected',
  contract_sent:              'Contract Sent',
  contract_rejected:          'Contract Rejected',
  contract_signed:            'Contract Signed',
  closed_deal:                'Closed Deal',
  cancelled_deal:             'Cancelled Deal',
}

const KPI_ORDER = Object.keys(KPI_LABELS)

const SOURCE_KPIS_LIST = ['lead', 'lead_assigned', 'appointment_set', 'contract_signed', 'cancelled_deal']
const SOURCE_KPIS      = new Set(SOURCE_KPIS_LIST)

type SessionSortKey = 'agent_name' | 'sessions' | 'total_calls' | 'manual_calls' | 'talk_time_sec' | 'leads_submitted'

// ── component ─────────────────────────────────────────────────────────────────

export default function CallsClient() {
  const [period,       setPeriod]       = useState<DatePeriod>('30d')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [agentTypeTab, setAgentTypeTab] = useState<'Agent' | 'Type'>('Agent')
  const [sessionSort,  setSessionSort]  = useState<SessionSortKey>('leads_submitted')
  const [sessionDir,   setSessionDir]   = useState<'asc' | 'desc'>('desc')

  // ── filtered ACQ + Call source events ────────────────────────────────────────

  const callEvents = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (e.kpi_type !== 'ACQ') return false
      if (e.lead_source !== 'Call') return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo])

  // ── filtered caller sessions ──────────────────────────────────────────────────

  const callSessions = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_CALLER_SESSIONS.filter(s => {
      const d = new Date(s.log_date)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo])

  // ── stat cards ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const leads    = callEvents.filter(e => e.kpi_name === 'lead').length
    const apptSet  = new Set(callEvents.filter(e => e.kpi_name === 'appointment_set').map(e => e.contact_id)).size
    const closed   = new Set(callEvents.filter(e => e.kpi_name === 'closed_deal').map(e => e.contact_id)).size
    const totalCalls = callSessions.reduce((s, r) => s + r.total_calls, 0)
    return { leads, apptSet, closed, totalCalls }
  }, [callEvents, callSessions])

  // ── trend chart data (daily calls + leads) ────────────────────────────────────

  const trendData = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    const start = from ?? new Date(NOW - 29 * DAY_MS)
    const end   = to   ?? new Date(NOW)

    // Build ordered date list
    const dates: string[] = []
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 999)
    while (cur <= endDay) {
      dates.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }

    // Sum calls per day from sessions
    const callsMap = new Map<string, number>()
    for (const s of DUMMY_CALLER_SESSIONS) {
      const d = new Date(s.log_date)
      if (d >= start && d <= endDay) {
        callsMap.set(s.log_date, (callsMap.get(s.log_date) ?? 0) + s.total_calls)
      }
    }

    // Sum leads submitted per day from sessions
    const leadsMap = new Map<string, number>()
    for (const s of DUMMY_CALLER_SESSIONS) {
      const d = new Date(s.log_date)
      if (d >= start && d <= endDay) {
        leadsMap.set(s.log_date, (leadsMap.get(s.log_date) ?? 0) + s.leads_submitted)
      }
    }

    return dates.map(date => ({
      date,
      calls:  callsMap.get(date)  ?? 0,
      leads:  leadsMap.get(date)  ?? 0,
    }))
  }, [period, customFrom, customTo])

  // ── agent / type toggle ───────────────────────────────────────────────────────

  const agentRows = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of callEvents.filter(ev => ev.kpi_name === 'lead'))
      map.set(e.user_name, (map.get(e.user_name) ?? 0) + 1)
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [callEvents])

  const typeRows = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of callEvents.filter(ev => ev.kpi_name === 'lead')) {
      const t = e.contact_type || 'Lead'
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [callEvents])

  // ── source-specific KPI counts ───────────────────────────────────────────────

  const sourceKpiCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of callEvents) {
      if (SOURCE_KPIS.has(e.kpi_name)) map.set(e.kpi_name, (map.get(e.kpi_name) ?? 0) + 1)
    }
    return map
  }, [callEvents])

  // ── CRM KPI table ─────────────────────────────────────────────────────────────

  const kpiRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of callEvents) counts.set(e.kpi_name, (counts.get(e.kpi_name) ?? 0) + 1)
    const leadCount = counts.get('lead') ?? 0
    return KPI_ORDER.map(k => {
      const count = counts.get(k) ?? 0
      return {
        key:   k,
        label: KPI_LABELS[k] ?? k,
        count,
        ratio: (SOURCE_KPIS.has(k) && k !== 'lead' && count > 0) ? (leadCount / count).toFixed(2) : '—',
      }
    })
  }, [callEvents])

  // ── session sort ──────────────────────────────────────────────────────────────

  const agentSessionRows = useMemo(() => {
    type R = { sessions: number; total_calls: number; manual_calls: number; talk_time_sec: number; leads_submitted: number }
    const map = new Map<string, R>()
    for (const s of callSessions) {
      if (!map.has(s.agent_name)) map.set(s.agent_name, { sessions: 0, total_calls: 0, manual_calls: 0, talk_time_sec: 0, leads_submitted: 0 })
      const r = map.get(s.agent_name)!
      r.sessions++
      r.total_calls     += s.total_calls
      r.manual_calls    += s.manual_calls
      r.talk_time_sec   += s.talk_time_sec
      r.leads_submitted += s.leads_submitted
    }
    return [...map.entries()].map(([agent_name, d]) => ({ agent_name, ...d }))
  }, [callSessions])

  const sortedSessions = useMemo(() => {
    return [...agentSessionRows].sort((a, b) => {
      const diff = sessionSort === 'agent_name'
        ? a.agent_name.localeCompare(b.agent_name)
        : (a[sessionSort] as number) - (b[sessionSort] as number)
      return sessionDir === 'asc' ? diff : -diff
    })
  }, [agentSessionRows, sessionSort, sessionDir])

  function handleSessionSort(key: SessionSortKey) {
    if (sessionSort === key) setSessionDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSessionSort(key); setSessionDir('desc') }
  }

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>Call Source</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>ACQ pipeline performance for leads sourced via cold calling</p>
        </div>
        <DateRangePicker
          period={period} customFrom={customFrom} customTo={customTo}
          onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
        />
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Leads',  value: stats.leads.toLocaleString(),      accent: C.blue   },
          { label: 'Appts Set',    value: stats.apptSet.toLocaleString(),    accent: C.blue   },
          { label: 'Closed Deals', value: stats.closed.toLocaleString(),     accent: C.green  },
          { label: 'Calls Dialed', value: stats.totalCalls.toLocaleString(), accent: C.yellow },
        ].map(card => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.accent, lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Trend Line Chart ─────────────────────────────────────── */}
      {trendData.length > 1 && (() => {
        const W = 800, H = 180
        const PAD = { top: 20, right: 20, bottom: 32, left: 44 }
        const innerW = W - PAD.left - PAD.right
        const innerH = H - PAD.top  - PAD.bottom
        const base   = PAD.top + innerH

        const maxCalls  = Math.max(...trendData.map(d => d.calls),  1)
        const maxLeads  = Math.max(...trendData.map(d => d.leads),  1)
        const xStep     = innerW / Math.max(trendData.length - 1, 1)
        const labelEvery = trendData.length <= 7 ? 1 : trendData.length <= 14 ? 2 : trendData.length <= 31 ? 5 : 7

        // Each series uses its own Y scale
        const yLeft  = [0, 0.5, 1].map(p => ({ val: Math.round(maxCalls * p), y: base - p * innerH }))
        const yRight = [0, 0.5, 1].map(p => ({ val: Math.round(maxLeads * p), y: base - p * innerH }))

        const coords = (key: 'calls' | 'leads') => {
          const max = key === 'calls' ? maxCalls : maxLeads
          return trendData.map((d, i) => ({
            x: PAD.left + i * xStep,
            y: base - (d[key] / max) * innerH,
          }))
        }

        const linePts = (key: 'calls' | 'leads') =>
          coords(key).map(p => `${p.x},${p.y}`).join(' ')

        const areaPts = (key: 'calls' | 'leads') => {
          const c = coords(key)
          return `${c[0].x},${base} ` + c.map(p => `${p.x},${p.y}`).join(' ') + ` ${c[c.length - 1].x},${base}`
        }

        return (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Daily Activity Trend</span>
                <span style={{ fontSize: 12, color: C.dimText, marginLeft: 10 }}>calls made vs leads submitted per day</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { color: C.blue,  label: 'Calls Made',      axis: '← left axis',  total: trendData.reduce((s, d) => s + d.calls,  0) },
                  { color: C.green, label: 'Leads Submitted', axis: 'right axis →',  total: trendData.reduce((s, d) => s + d.leads,  0) },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 3, background: l.color, borderRadius: 2 }} />
                    <div>
                      <div style={{ fontSize: 11, color: C.mutedText, lineHeight: 1 }}>{l.label} <span style={{ fontSize: 10, color: l.color, opacity: 0.6 }}>{l.axis}</span></div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: l.color, lineHeight: 1.4 }}>{l.total.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
              <defs>
                <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.blue}  stopOpacity="0.25" />
                  <stop offset="100%" stopColor={C.blue}  stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.green} stopOpacity="0.20" />
                  <stop offset="100%" stopColor={C.green} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid lines + left Y labels (calls) */}
              {yLeft.map(t => (
                <g key={`l${t.val}`}>
                  <line x1={PAD.left} y1={t.y} x2={PAD.left + innerW} y2={t.y}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray={t.val === 0 ? undefined : '4 3'} />
                  <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize={10} fill={C.blue}>{t.val}</text>
                </g>
              ))}
              {/* Right Y labels (leads) */}
              {yRight.map(t => (
                <text key={`r${t.val}`} x={PAD.left + innerW + 8} y={t.y + 4} textAnchor="start" fontSize={10} fill={C.green}>{t.val}</text>
              ))}
              {/* Right axis line */}
              <line x1={PAD.left + innerW} y1={PAD.top} x2={PAD.left + innerW} y2={base}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

              {/* X labels */}
              {trendData.map((d, i) => i % labelEvery === 0 && (
                <text key={d.date} x={PAD.left + i * xStep} y={H - 6}
                  textAnchor="middle" fontSize={10} fill={C.dimText}>
                  {d.date.slice(5)}
                </text>
              ))}

              {/* Filled areas */}
              <polygon points={areaPts('calls')} fill="url(#callsGrad)" />
              <polygon points={areaPts('leads')} fill="url(#leadsGrad)" />

              {/* Lines */}
              <polyline points={linePts('calls')} fill="none" stroke={C.blue}  strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={linePts('leads')} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

              {/* Dots on non-zero points */}
              {coords('calls').map((p, i) => trendData[i].calls > 0 && (
                <circle key={`c${i}`} cx={p.x} cy={p.y} r={3.5} fill={C.blue}  stroke={C.card} strokeWidth={1.5} />
              ))}
              {coords('leads').map((p, i) => trendData[i].leads > 0 && (
                <circle key={`l${i}`} cx={p.x} cy={p.y} r={3.5} fill={C.green} stroke={C.card} strokeWidth={1.5} />
              ))}
            </svg>
          </div>
        )
      })()}

      {/* ── Source KPIs ──────────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Call Source KPIs</span>
          <span style={{ fontSize: 11, color: C.dimText }}>KPIs tracked specifically for this lead source</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${bd}` }}>
              <th style={{ padding: '10px 20px', textAlign: 'left',  fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>KPI</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Record Count</th>
            </tr>
          </thead>
          <tbody>
            {SOURCE_KPIS_LIST.map((k, i, arr) => {
              const count = sourceKpiCounts.get(k) ?? 0
              return (
                <tr key={k} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 20px', fontSize: 13, color: k === 'lead' ? C.blue : C.text, fontWeight: k === 'lead' ? 700 : 400 }}>{KPI_LABELS[k] ?? k}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: count > 0 ? C.blue : C.dimText }}>{count.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Agent/Type toggle + CRM KPI table ────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>

        {/* Agent / Type toggle */}
        <div style={{ flex: 1, background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${bd}` }}>
            {(['Agent', 'Type'] as const).map(tab => {
              const active = agentTypeTab === tab
              return (
                <button key={tab} onClick={() => setAgentTypeTab(tab)} style={{
                  flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? 'rgba(48,125,192,0.1)' : 'transparent',
                  color:      active ? C.white : C.mutedText,
                  borderBottom: active ? `2px solid ${C.blue}` : '2px solid transparent',
                }}>
                  {tab}
                </button>
              )
            })}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                <th style={{ padding: '10px 20px', textAlign: 'left',  fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {agentTypeTab === 'Agent' ? 'Agent' : 'Lead Type'}
                </th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Leads Submitted</th>
              </tr>
            </thead>
            <tbody>
              {(agentTypeTab === 'Agent' ? agentRows : typeRows).map((row, i, arr) => (
                <tr key={row.name}
                  style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 20px', fontSize: 14, color: C.text }}>{row.name}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.blue }}>{row.count.toLocaleString()}</td>
                </tr>
              ))}
              {(agentTypeTab === 'Agent' ? agentRows : typeRows).length === 0 && (
                <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.dimText }}>No data</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Call CRM KPI table */}
        <div style={{ flex: 2, background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Call CRM KPIs</span>
            <span style={{ fontSize: 11, color: C.dimText }}>Leads / KPI = Total Leads ÷ KPI Count</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                <th style={{ padding: '10px 20px', textAlign: 'left',  fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>KPI</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Count</th>
                <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Leads / KPI</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.map((row, i) => (
                <tr key={row.key}
                  style={{ borderBottom: i < kpiRows.length - 1 ? `1px solid ${bd}` : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 20px', fontSize: 13, color: row.key === 'lead' ? C.blue : C.text, fontWeight: row.key === 'lead' ? 700 : 400 }}>
                    {row.label}
                  </td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, color: C.bodyText }}>{row.count.toLocaleString()}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, color: row.ratio === '—' ? C.dimText : C.yellow, fontWeight: 600 }}>
                    {row.ratio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Calls Per Agent Bar Chart ────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 20 }}>Calls Made Per Agent</div>
        {(() => {
          const maxCalls = Math.max(...agentSessionRows.map(r => r.total_calls), 1)
          return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160 }}>
              {agentSessionRows
                .slice()
                .sort((a, b) => b.total_calls - a.total_calls)
                .map(r => {
                  const barH = Math.max((r.total_calls / maxCalls) * 130, 4)
                  return (
                    <div key={r.agent_name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{r.total_calls.toLocaleString()}</span>
                      <div style={{
                        width: '100%', height: barH,
                        background: `linear-gradient(to top, ${C.blue}, rgba(48,125,192,0.5))`,
                        borderRadius: '4px 4px 0 0', transition: 'height 0.3s',
                      }} />
                      <span style={{ fontSize: 11, color: C.mutedText, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
                        {r.agent_name.split(' ')[0]}
                      </span>
                    </div>
                  )
                })}
              {agentSessionRows.length === 0 && (
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, color: C.dimText, alignSelf: 'center' }}>No data for this period</div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ── Cold Calling KPI Table ───────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Cold Calling KPIs</span>
          <span style={{ fontSize: 11, color: C.dimText }}>Per session · from GHL dialer logs</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {([
                  { key: 'agent_name',      label: 'Agent',           align: 'left'  },
                  { key: 'sessions',        label: 'Sessions',        align: 'right' },
                  { key: 'total_calls',     label: 'Total Calls',     align: 'right' },
                  { key: 'manual_calls',    label: 'Manual Calls',    align: 'right' },
                  { key: 'talk_time_sec',   label: 'Talk Time',       align: 'right' },
                  { key: 'leads_submitted', label: 'Leads Submitted', align: 'right' },
                ] as { key: SessionSortKey; label: string; align: 'left' | 'right' }[]).map(col => {
                  const active = sessionSort === col.key
                  return (
                    <th key={col.key} onClick={() => handleSessionSort(col.key)} style={{
                      padding: '10px 20px', textAlign: col.align,
                      fontSize: 11, fontWeight: 700, color: active ? C.white : C.dimText,
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                        {col.label}
                        {active
                          ? sessionDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                          : <ChevronDown size={12} style={{ opacity: 0.2 }} />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedSessions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', fontSize: 13, color: C.dimText }}>
                    No sessions logged for this period
                  </td>
                </tr>
              )}
              {sortedSessions.map((s, i) => (
                <tr key={s.agent_name}
                  style={{ borderBottom: i < sortedSessions.length - 1 ? `1px solid ${bd}` : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 20px', fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{s.agent_name}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, color: C.bodyText }}>{s.sessions}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, color: C.text }}>{s.total_calls.toLocaleString()}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, color: C.text }}>{s.manual_calls.toLocaleString()}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, color: C.bodyText }}>{fmtTalkTime(s.talk_time_sec)}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, color: s.leads_submitted > 0 ? C.green : C.mutedText, fontWeight: 700 }}>
                    {s.leads_submitted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
