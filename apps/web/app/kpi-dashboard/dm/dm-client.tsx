'use client'

import { useState, useMemo } from 'react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS, DUMMY_DM_META } from '../dummy-data'

const NOW    = Date.now()
const DAY_MS = 86_400_000

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

const SOURCE_KPIS_LIST = ['lead_assigned', 'closed_deal', 'appointment_held']
const SOURCE_KPIS      = new Set(SOURCE_KPIS_LIST)

export default function DmClient() {
  const [period,     setPeriod]     = useState<DatePeriod>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  // ── filtered ACQ + DM events ──────────────────────────────────────────────────

  const dmEvents = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (e.kpi_type !== 'ACQ') return false
      if (e.lead_source !== 'DM') return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo])

  // ── meta lookup ───────────────────────────────────────────────────────────────

  const metaMap = useMemo(() => new Map(DUMMY_DM_META.map(m => [m.contact_id, m])), [])

  // ── stat cards ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const leads   = dmEvents.filter(e => e.kpi_name === 'lead').length
    const apptSet = new Set(dmEvents.filter(e => e.kpi_name === 'appointment_set').map(e => e.contact_id)).size
    const closed  = new Set(dmEvents.filter(e => e.kpi_name === 'closed_deal').map(e => e.contact_id)).size
    const campaigns = new Set(dmEvents.filter(e => e.kpi_name === 'lead').map(e => metaMap.get(e.contact_id)?.campaign).filter(Boolean)).size
    return { leads, apptSet, closed, campaigns }
  }, [dmEvents, metaMap])

  // ── trend chart ───────────────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    const start  = from ?? new Date(NOW - 29 * DAY_MS)
    const end    = to   ?? new Date(NOW)
    const dates: string[] = []
    const cur = new Date(start); cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end); endDay.setHours(23, 59, 59, 999)
    while (cur <= endDay) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
    const leadsMap = new Map<string, number>()
    const apptMap  = new Map<string, number>()
    for (const e of dmEvents) {
      const d = e.occurred_at.slice(0, 10)
      if (e.kpi_name === 'lead')            leadsMap.set(d, (leadsMap.get(d) ?? 0) + 1)
      if (e.kpi_name === 'appointment_set') apptMap.set(d,  (apptMap.get(d)  ?? 0) + 1)
    }
    return dates.map(date => ({ date, leads: leadsMap.get(date) ?? 0, appts: apptMap.get(date) ?? 0 }))
  }, [dmEvents, period, customFrom, customTo])

  // ── campaign table ────────────────────────────────────────────────────────────

  const campaignRows = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of dmEvents.filter(ev => ev.kpi_name === 'lead')) {
      const campaign = metaMap.get(e.contact_id)?.campaign ?? 'Unknown'
      map.set(campaign, (map.get(campaign) ?? 0) + 1)
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [dmEvents, metaMap])

  // ── source-specific KPI counts ───────────────────────────────────────────────

  const sourceKpiCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of dmEvents) {
      if (SOURCE_KPIS.has(e.kpi_name)) map.set(e.kpi_name, (map.get(e.kpi_name) ?? 0) + 1)
    }
    return map
  }, [dmEvents])

  // ── CRM KPI table ─────────────────────────────────────────────────────────────

  const kpiRows = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of dmEvents) counts.set(e.kpi_name, (counts.get(e.kpi_name) ?? 0) + 1)
    const leadCount = counts.get('lead') ?? 0
    return KPI_ORDER.map(k => {
      const count = counts.get(k) ?? 0
      return { key: k, label: KPI_LABELS[k] ?? k, count, ratio: (SOURCE_KPIS.has(k) && k !== 'lead' && count > 0) ? (leadCount / count).toFixed(2) : '—' }
    })
  }, [dmEvents])

  const leadsPerAgent = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of dmEvents) if (e.kpi_name === 'lead') map.set(e.user_name, (map.get(e.user_name) ?? 0) + 1)
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [dmEvents])

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>Direct Mail Source</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>ACQ pipeline performance for leads sourced via direct mail campaigns</p>
        </div>
        <DateRangePicker period={period} customFrom={customFrom} customTo={customTo}
          onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
      </div>

      {/* ── Stat cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Leads',   value: stats.leads.toLocaleString(),     accent: C.blue   },
          { label: 'Appts Set',     value: stats.apptSet.toLocaleString(),   accent: C.blue   },
          { label: 'Closed Deals',  value: stats.closed.toLocaleString(),    accent: C.green  },
          { label: 'Campaigns Run', value: stats.campaigns.toLocaleString(), accent: C.yellow },
        ].map(card => (
          <div key={card.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.accent, lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Trend Line Chart ─────────────────────────────────────── */}
      {trendData.length > 1 && (() => {
        const W = 800, H = 180
        const PAD = { top: 20, right: 44, bottom: 32, left: 44 }
        const innerW = W - PAD.left - PAD.right
        const innerH = H - PAD.top - PAD.bottom
        const base   = PAD.top + innerH

        const maxLeads = Math.max(...trendData.map(d => d.leads), 1)
        const maxAppts = Math.max(...trendData.map(d => d.appts), 1)
        const xStep    = innerW / Math.max(trendData.length - 1, 1)
        const labelEvery = trendData.length <= 7 ? 1 : trendData.length <= 14 ? 2 : trendData.length <= 31 ? 5 : 7

        const yLeft  = [0, 0.5, 1].map(p => ({ val: Math.round(maxLeads * p), y: base - p * innerH }))
        const yRight = [0, 0.5, 1].map(p => ({ val: Math.round(maxAppts * p), y: base - p * innerH }))

        const coords = (key: 'leads' | 'appts') => {
          const max = key === 'leads' ? maxLeads : maxAppts
          return trendData.map((d, i) => ({ x: PAD.left + i * xStep, y: base - (d[key] / max) * innerH }))
        }
        const linePts = (key: 'leads' | 'appts') => coords(key).map(p => `${p.x},${p.y}`).join(' ')
        const areaPts = (key: 'leads' | 'appts') => {
          const c = coords(key)
          return `${c[0].x},${base} ` + c.map(p => `${p.x},${p.y}`).join(' ') + ` ${c[c.length - 1].x},${base}`
        }

        return (
          <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Daily Activity Trend</span>
                <span style={{ fontSize: 12, color: C.dimText, marginLeft: 10 }}>leads received vs appointments set per day</span>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { color: C.blue,  label: 'Leads Received',   axis: '← left axis',  total: trendData.reduce((s, d) => s + d.leads, 0) },
                  { color: C.green, label: 'Appointments Set', axis: 'right axis →', total: trendData.reduce((s, d) => s + d.appts, 0) },
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
                <linearGradient id="dmLeadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.blue}  stopOpacity="0.25" />
                  <stop offset="100%" stopColor={C.blue}  stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="dmApptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.green} stopOpacity="0.20" />
                  <stop offset="100%" stopColor={C.green} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {yLeft.map(t => (
                <g key={`dl${t.val}`}>
                  <line x1={PAD.left} y1={t.y} x2={PAD.left + innerW} y2={t.y}
                    stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray={t.val === 0 ? undefined : '4 3'} />
                  <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize={10} fill={C.blue}>{t.val}</text>
                </g>
              ))}
              {yRight.map(t => (
                <text key={`dr${t.val}`} x={PAD.left + innerW + 8} y={t.y + 4} textAnchor="start" fontSize={10} fill={C.green}>{t.val}</text>
              ))}
              <line x1={PAD.left + innerW} y1={PAD.top} x2={PAD.left + innerW} y2={base} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              {trendData.map((d, i) => i % labelEvery === 0 && (
                <text key={d.date} x={PAD.left + i * xStep} y={H - 6} textAnchor="middle" fontSize={10} fill={C.dimText}>{d.date.slice(5)}</text>
              ))}
              <polygon points={areaPts('leads')} fill="url(#dmLeadsGrad)" />
              <polygon points={areaPts('appts')} fill="url(#dmApptsGrad)" />
              <polyline points={linePts('leads')} fill="none" stroke={C.blue}  strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={linePts('appts')} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {coords('leads').map((p, i) => trendData[i].leads > 0 && <circle key={`l${i}`} cx={p.x} cy={p.y} r={3.5} fill={C.blue}  stroke={C.card} strokeWidth={1.5} />)}
              {coords('appts').map((p, i) => trendData[i].appts > 0 && <circle key={`a${i}`} cx={p.x} cy={p.y} r={3.5} fill={C.green} stroke={C.card} strokeWidth={1.5} />)}
            </svg>
          </div>
        )
      })()}

      {/* ── Campaign table + CRM KPI table ───────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'stretch' }}>

        {/* Campaign table */}
        <div style={{ flex: 1, background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Campaigns</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  <th style={{ padding: '10px 20px', textAlign: 'left',  fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Campaign</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Record Count</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.map((row, i, arr) => (
                  <tr key={row.name} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 20px', fontSize: 14, color: C.text }}>{row.name}</td>
                    <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.blue }}>{row.count.toLocaleString()}</td>
                  </tr>
                ))}
                {campaignRows.length === 0 && (
                  <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.dimText }}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DM CRM KPI table */}
        <div style={{ flex: 2, background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>DM CRM KPIs</span>
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
                  <tr key={row.key} style={{ borderBottom: i < kpiRows.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 20px', fontSize: 13, color: row.key === 'lead' ? C.blue : C.text, fontWeight: row.key === 'lead' ? 700 : 400 }}>{row.label}</td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, color: C.bodyText }}>{row.count.toLocaleString()}</td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, color: row.ratio === '—' ? C.dimText : C.yellow, fontWeight: 600 }}>{row.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Leads by Campaign Bar Chart ──────────────────────────── */}
      {campaignRows.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 20 }}>Leads by Campaign</div>
          {(() => {
            const maxCount = Math.max(...campaignRows.map(r => r.count), 1)
            return (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160 }}>
                {campaignRows.map(r => {
                  const barH = Math.max((r.count / maxCount) * 130, 4)
                  return (
                    <div key={r.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{r.count}</span>
                      <div style={{ width: '100%', height: barH, background: `linear-gradient(to top, ${C.blue}, rgba(48,125,192,0.4))`, borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 10, color: C.mutedText, textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>{r.name}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Leads by Agent ──────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${bd}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Leads by Agent</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${bd}` }}>
              <th style={{ padding: '10px 20px', textAlign: 'left',  fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agent</th>
              <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Leads Assigned</th>
            </tr>
          </thead>
          <tbody>
            {leadsPerAgent.length === 0 && (
              <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', fontSize: 13, color: C.dimText }}>No data</td></tr>
            )}
            {leadsPerAgent.map((row, i, arr) => (
              <tr key={row.name}
                style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '11px 20px', fontSize: 14, color: C.text, fontWeight: 600 }}>{row.name}</td>
                <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.blue }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: C.dimText, background: 'rgba(252,175,23,0.07)', border: '1px solid rgba(252,175,23,0.15)', borderRadius: 6, padding: '5px 12px', letterSpacing: '0.04em' }}>
          MOCKUP - dummy data, replace with Supabase query in Milestone 2
        </span>
      </div>
    </div>
  )
}
