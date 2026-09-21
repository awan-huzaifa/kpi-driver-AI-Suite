'use client'

import { useState, useMemo } from 'react'
import { Users, Target, TrendingUp, DollarSign, FileSignature } from 'lucide-react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS, type DummyKpiEvent } from './dummy-data'

// ── helpers ──────────────────────────────────────────────────────────────────

function uniqueAt(events: DummyKpiEvent[], ...kpiNames: string[]): number {
  const s = new Set<string>()
  for (const e of events) if (kpiNames.includes(e.kpi_name)) s.add(e.contact_id)
  return s.size
}

function fmt(n: number) { return n.toLocaleString() }
function fmtK(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}` }

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function Sparkline({ data, color, h = 44, w = 120 }: { data: number[]; color: string; h?: number; w?: number }) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />
  const max = Math.max(...data, 1)
  const pts = data.map((v, i): [number, number] => [
    (i / (data.length - 1)) * w,
    h - (v / max) * (h - 6) - 3,
  ])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `M ${pts[0][0]},${h} ` + pts.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L ${pts[pts.length - 1][0]},${h} Z`
  const gid  = `sg${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent, sparkData }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; sparkData?: number[]
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, transparent)`, borderRadius: '14px 14px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 8, right: 12, opacity: 0.6 }}>
        {sparkData && <Sparkline data={sparkData} color={accent} h={36} w={80} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</div>
        <span style={{ fontSize: 10, color: C.dimText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: C.white, lineHeight: 1, marginBottom: 5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mutedText }}>{sub}</div>}
    </div>
  )
}

// ── Enhanced funnel panel ─────────────────────────────────────────────────────

function FunnelPanel({ title, stages, events, color }: {
  title: string; stages: { key: string; label: string }[]; events: DummyKpiEvent[]; color: string
}) {
  const counts = stages.map(s => uniqueAt(events, s.key))
  const max    = Math.max(counts[0] ?? 0, 1)

  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}88` }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {stages.map((stage, i) => {
          const count    = counts[i]
          const prev     = i > 0 ? counts[i - 1] : 0
          const conv     = i > 0 && prev > 0 ? Math.round(count / prev * 100) : null
          const barW     = (count / max) * 100
          const convColor = conv == null ? C.dimText : conv >= 60 ? C.green : conv >= 30 ? C.yellow : C.red

          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i === 0 ? color : `${color}60`, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.bodyText, fontWeight: 500 }}>{stage.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {conv !== null && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: `${convColor}15`, color: convColor, border: `1px solid ${convColor}30` }}>
                      {conv}%↓
                    </span>
                  )}
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.white, minWidth: 28, textAlign: 'right' }}>{count}</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${barW}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 3, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
      {/* total count badge */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.dimText }}>Lead → Close</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: color }}>
          {counts[0] > 0 ? `${((counts[counts.length - 1] / counts[0]) * 100).toFixed(1)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

// ── funnel stage configs ──────────────────────────────────────────────────────

const ACQ_STAGES = [
  { key: 'lead',             label: 'Lead'              },
  { key: 'lead_assigned',    label: 'Lead Assigned'     },
  { key: 'appointment_set',  label: 'Appointment Set'   },
  { key: 'appointment_held', label: 'Appointment Held'  },
  { key: 'offer_made',       label: 'Offer Made'        },
  { key: 'contract_signed',  label: 'Contract Signed'   },
  { key: 'closed_deal',      label: 'Closed Deal'       },
]

const DISPO_STAGES = [
  { key: 'lead',           label: 'Lead'           },
  { key: 'lead_assigned',  label: 'Lead Assigned'  },
  { key: 'interested',     label: 'Interested'     },
  { key: 'showing_set',    label: 'Showing Set'    },
  { key: 'showing_held',   label: 'Showing Held'   },
  { key: 'offer_received', label: 'Offer Received' },
  { key: 'closed_deal',    label: 'Closed Deal'    },
]

const AVATAR_PALETTE = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22', '#e84393', '#1abc9c']
const RANK_STYLES = [
  { bg: 'rgba(255,215,0,0.12)',   color: '#FFD700', border: 'rgba(255,215,0,0.35)'   },
  { bg: 'rgba(192,192,192,0.12)', color: '#C0C0C0', border: 'rgba(192,192,192,0.35)' },
  { bg: 'rgba(205,127,50,0.12)',  color: '#CD7F32', border: 'rgba(205,127,50,0.35)'  },
]

// ── main ──────────────────────────────────────────────────────────────────────

type TypeFilter = 'All' | 'ACQ' | 'DISPO'

export default function OverviewClient() {
  const [period,     setPeriod]     = useState<DatePeriod>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [netKpi,     setNetKpi]     = useState(false)

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
      if (typeFilter !== 'All' && e.kpi_type !== typeFilter) return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      if (netKpiContactIds && !netKpiContactIds.has(e.contact_id)) return false
      return true
    })
  }, [period, customFrom, customTo, typeFilter, netKpiContactIds])

  const acqFiltered   = useMemo(() => filtered.filter(e => e.kpi_type === 'ACQ'),   [filtered])
  const dispoFiltered = useMemo(() => filtered.filter(e => e.kpi_type === 'DISPO'),  [filtered])

  const totalLeads      = uniqueAt(filtered, 'lead')
  const meetings        = uniqueAt(filtered, 'appointment_set', 'showing_set')
  const contractsSigned = uniqueAt(filtered, 'contract_signed')
  const closedDeals     = uniqueAt(filtered, 'closed_deal')
  const totalProfit     = filtered.filter(e => e.kpi_name === 'closed_deal').reduce((s, e) => s + (e.potential_profit ?? 0), 0)
  const convRate        = totalLeads > 0 ? (closedDeals / totalLeads * 100).toFixed(1) + '%' : '—'

  // ── Daily lead trend (up to 30 buckets) ──────────────────────────────────────
  const { dailyTrendAcq, dailyTrendDispo } = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    const start  = from  ?? new Date(Date.now() - 30 * 24 * 3600 * 1000)
    const end    = to    ?? new Date()
    const totalMs = Math.max(end.getTime() - start.getTime(), 1)
    const buckets = Math.min(Math.ceil(totalMs / (24 * 3600 * 1000)), 30)
    const bucketMs = totalMs / buckets
    const acq   = new Array(buckets).fill(0)
    const dispo = new Array(buckets).fill(0)
    for (const e of DUMMY_EVENTS) {
      if (e.kpi_name !== 'lead') continue
      const t   = new Date(e.occurred_at).getTime()
      const idx = Math.min(Math.floor((t - start.getTime()) / bucketMs), buckets - 1)
      if (idx < 0) continue
      if (e.kpi_type === 'ACQ')   acq[idx]++
      else                         dispo[idx]++
    }
    return { dailyTrendAcq: acq, dailyTrendDispo: dispo }
  }, [period, customFrom, customTo])

  // ── Lead source breakdown ─────────────────────────────────────────────────────
  const leadSourceRows = useMemo(() => {
    const m = new Map<string, { acq: number; dispo: number }>()
    for (const e of filtered) {
      if (e.kpi_name !== 'lead') continue
      if (!m.has(e.lead_source)) m.set(e.lead_source, { acq: 0, dispo: 0 })
      const r = m.get(e.lead_source)!
      if (e.kpi_type === 'ACQ') r.acq++ ; else r.dispo++
    }
    return [...m.entries()]
      .map(([src, d]) => ({ src, total: d.acq + d.dispo, acq: d.acq, dispo: d.dispo }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [filtered])

  const maxSrcTotal = useMemo(() => Math.max(...leadSourceRows.map(r => r.total), 1), [leadSourceRows])

  // ── Rep table ─────────────────────────────────────────────────────────────────
  const reps = useMemo(() => {
    type RepData = { type: string; leads: Set<string>; meetings: Set<string>; offers: Set<string>; closed: Set<string>; profit: number }
    const map = new Map<string, RepData>()
    for (const e of filtered) {
      if (!map.has(e.user_name)) map.set(e.user_name, { type: e.kpi_type, leads: new Set(), meetings: new Set(), offers: new Set(), closed: new Set(), profit: 0 })
      const r = map.get(e.user_name)!
      if (e.kpi_name === 'lead') r.leads.add(e.contact_id)
      if (e.kpi_name === 'appointment_set' || e.kpi_name === 'showing_set') r.meetings.add(e.contact_id)
      if (e.kpi_name === 'offer_made' || e.kpi_name === 'offer_received')   r.offers.add(e.contact_id)
      if (e.kpi_name === 'closed_deal') { r.closed.add(e.contact_id); r.profit += e.potential_profit ?? 0 }
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, type: d.type, leads: d.leads.size, meetings: d.meetings.size, offers: d.offers.size, closed: d.closed.size, profit: d.profit, conv: d.leads.size > 0 ? (d.closed.size / d.leads.size * 100) : 0 }))
      .sort((a, b) => b.closed - a.closed || b.leads - a.leads)
  }, [filtered])

  const maxClosed = useMemo(() => Math.max(...reps.map(r => r.closed), 1), [reps])
  const maxProfit = useMemo(() => Math.max(...reps.map(r => r.profit), 1), [reps])

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: 0 }}>KPI Overview</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Pipeline performance at a glance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {(['KPI', 'Net KPI'] as const).map(mode => {
              const active = (mode === 'Net KPI') === netKpi
              return (
                <button key={mode} onClick={() => setNetKpi(mode === 'Net KPI')} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer', background: active ? C.blue : 'transparent', color: active ? C.white : C.dimText, transition: 'all 0.15s' }}>{mode}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['All', 'ACQ', 'DISPO'] as TypeFilter[]).map(t => {
              const active = typeFilter === t
              const bg = t === 'DISPO' ? C.yellow : C.blue
              const cl = t === 'DISPO' ? '#0D1C2A' : C.white
              return (
                <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '7px 18px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: active ? bg : 'transparent', color: active ? cl : C.mutedText, transition: 'all 0.15s' }}>{t}</button>
              )
            })}
          </div>
          <DateRangePicker period={period} customFrom={customFrom} customTo={customTo} onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <StatCard icon={<Users size={14} />}         label="Total Leads"      value={fmt(totalLeads)}      sub={typeFilter === 'All' ? `ACQ ${uniqueAt(acqFiltered,'lead')} · DISPO ${uniqueAt(dispoFiltered,'lead')}` : `${typeFilter} pipeline`} accent={C.blue}   sparkData={dailyTrendAcq}   />
        <StatCard icon={<Target size={14} />}        label="Meetings"         value={fmt(meetings)}        sub={typeFilter === 'All' ? `Appts ${uniqueAt(acqFiltered,'appointment_set')} · Showings ${uniqueAt(dispoFiltered,'showing_set')}` : typeFilter === 'ACQ' ? 'Appointments set' : 'Showings set'} accent={C.blue}  />
        <StatCard icon={<FileSignature size={14} />} label="Contracts Signed" value={fmt(contractsSigned)} sub={totalLeads > 0 ? `${(contractsSigned/totalLeads*100).toFixed(1)}% of leads` : 'No data'} accent={C.yellow} />
        <StatCard icon={<DollarSign size={14} />}    label="Closed Deals"     value={fmt(closedDeals)}     sub={totalProfit > 0 ? `${fmtK(totalProfit)} potential profit` : 'No closings'} accent={C.green} sparkData={dailyTrendDispo}  />
        <StatCard icon={<TrendingUp size={14} />}    label="Lead → Close"     value={convRate}             sub={`${closedDeals} of ${totalLeads} leads`} accent={C.yellow} />
      </div>

      {/* ── Trend + Sources row ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>

        {/* Lead Volume Trend */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.yellow}, transparent)` }} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Lead Volume Trend</div>
            <div style={{ fontSize: 11, color: C.dimText }}>Daily lead intake · ACQ vs DISPO</div>
          </div>
          <div style={{ position: 'relative', height: 80 }}>
            <svg width="100%" height="80" viewBox="0 0 400 80" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <linearGradient id="acqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.blue} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={C.blue} stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="dispoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.yellow} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={C.yellow} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {(() => {
                const n = dailyTrendAcq.length
                if (n < 2) return null
                const maxV = Math.max(...dailyTrendAcq, ...dailyTrendDispo, 1)
                const xScale = 400 / (n - 1)
                const yScale = 70 / maxV

                const acqPts  = dailyTrendAcq.map((v, i) => [i * xScale, 75 - v * yScale] as [number, number])
                const dispoPts = dailyTrendDispo.map((v, i) => [i * xScale, 75 - v * yScale] as [number, number])

                const acqLine  = acqPts.map(([x,y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' ')
                const dispoLine = dispoPts.map(([x,y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' ')

                const acqArea  = `M 0,80 ${acqPts.map(([x,y]) => `L ${x.toFixed(0)},${y.toFixed(0)}`).join(' ')} L 400,80 Z`
                const dispoArea = `M 0,80 ${dispoPts.map(([x,y]) => `L ${x.toFixed(0)},${y.toFixed(0)}`).join(' ')} L 400,80 Z`

                return (
                  <>
                    <path d={acqArea} fill="url(#acqGrad)" />
                    <path d={dispoArea} fill="url(#dispoGrad)" />
                    <polyline points={acqLine}   fill="none" stroke={C.blue}   strokeWidth="2" strokeLinejoin="round" />
                    <polyline points={dispoLine} fill="none" stroke={C.yellow} strokeWidth="2" strokeLinejoin="round" />
                  </>
                )
              })()}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            {[{ color: C.blue, label: 'ACQ', total: dailyTrendAcq.reduce((s,v) => s+v,0) }, { color: C.yellow, label: 'DISPO', total: dailyTrendDispo.reduce((s,v) => s+v,0) }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: C.dimText }}>{l.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{l.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.green}, transparent)` }} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Leads by Source</div>
            <div style={{ fontSize: 11, color: C.dimText }}>Top 8 channels · ACQ + DISPO</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {leadSourceRows.map((row, i) => {
              const acqPct   = row.total > 0 ? (row.acq  / row.total) * 100 : 0
              const dispoPct = row.total > 0 ? (row.dispo / row.total) * 100 : 0
              const barFill  = (row.total / maxSrcTotal) * 100
              return (
                <div key={row.src}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{row.src}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.white }}>{row.total}</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(barFill * acqPct) / 100}%`,   height: '100%', background: C.blue,    transition: 'width 0.4s' }} />
                    <div style={{ width: `${(barFill * dispoPct) / 100}%`, height: '100%', background: C.yellow,  transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {[{ color: C.blue, label: 'ACQ' }, { color: C.yellow, label: 'DISPO' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 10, color: C.dimText }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Funnel panels ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
        {typeFilter !== 'DISPO' && <FunnelPanel title="ACQ Funnel"   stages={ACQ_STAGES}   events={acqFiltered}   color={C.blue}   />}
        {typeFilter !== 'ACQ'   && <FunnelPanel title="DISPO Funnel" stages={DISPO_STAGES} events={dispoFiltered} color={C.yellow} />}
      </div>

      {/* ── Rep performance table ────────────────────────────────── */}
      {reps.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Rep Performance</span>
            <span style={{ fontSize: 11, color: C.dimText }}>{reps.length} reps · sorted by closed deals</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['#', 'Rep', 'Type', 'Leads', 'Meetings', 'Offers', 'Closed', 'Conv %', 'Profit'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Rep' || h === '#' ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reps.map((rep, i) => {
                  const rank      = i + 1
                  const rs        = RANK_STYLES[i]
                  const convColor = rep.conv >= 10 ? C.green : rep.conv >= 5 ? C.yellow : C.red
                  const initials  = rep.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
                  const avBg      = AVATAR_PALETTE[i % AVATAR_PALETTE.length]
                  return (
                    <tr key={rep.name} style={{ borderBottom: i < reps.length - 1 ? `1px solid ${bd}` : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Rank */}
                      <td style={{ padding: '12px 16px' }}>
                        {rank <= 3 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800, background: rs.bg, color: rs.color, border: `1px solid ${rs.border}` }}>{rank}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: C.dimText, fontWeight: 600, paddingLeft: 4 }}>{rank}</span>
                        )}
                      </td>
                      {/* Rep */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${avBg}22`, border: `1px solid ${avBg}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: avBg, flexShrink: 0 }}>{initials}</div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{rep.name}</span>
                        </div>
                      </td>
                      {/* Type */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: rep.type === 'ACQ' ? 'rgba(48,125,192,0.14)' : 'rgba(252,175,23,0.14)', color: rep.type === 'ACQ' ? C.blue : C.yellow, letterSpacing: '0.04em' }}>{rep.type}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: C.text }}>{rep.leads}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: C.text }}>{rep.meetings}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: C.text }}>{rep.offers}</td>
                      {/* Closed + bar */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: rep.closed > 0 ? 700 : 400, color: rep.closed > 0 ? C.green : C.dimText }}>{rep.closed}</span>
                          <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${(rep.closed / maxClosed) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.green}88)`, borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                      {/* Conv% */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: `${convColor}15`, color: convColor, border: `1px solid ${convColor}30` }}>{rep.conv.toFixed(1)}%</span>
                      </td>
                      {/* Profit + bar */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: rep.profit > 0 ? C.green : C.dimText }}>{fmtK(rep.profit)}</span>
                          <div style={{ width: 50, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${(rep.profit / maxProfit) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}88, ${C.green}44)`, borderRadius: 2 }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
