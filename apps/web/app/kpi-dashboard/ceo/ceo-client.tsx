'use client'

import { useMemo, useState } from 'react'
import { C } from '@/components/platform/brand'
import {
  DUMMY_EVENTS,
  ACQ_LEAD_SOURCE_COSTS,
  DISPO_LEAD_SOURCE_COSTS,
  CEO_EXPENSES,
  EXIT_STRATEGIES,
  DUMMY_EXIT_STRATEGIES,
} from '../dummy-data'

// ── helpers ───────────────────────────────────────────────────────────────────

const fmt$ = (n: number, decimals = 0) =>
  n >= 10000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`

const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`

function roasColor(r: number): string {
  if (r >= 6) return C.green
  if (r >= 4) return '#78c97e'
  if (r >= 2.5) return C.yellow
  if (r >= 1.5) return '#f59e0b'
  return C.red
}

function netColor(n: number): string {
  return n > 0 ? C.green : n < 0 ? C.red : C.dimText
}

// ── KPI stages for table columns ─────────────────────────────────────────────

const ACQ_KPI_COLS = [
  { key: 'appointment_set',          label: 'Appt Set'      },
  { key: 'appointment_held',         label: 'Appt Held'     },
  { key: 'live_transfer_successful', label: 'Live Transfer' },
  { key: 'offer_made',               label: 'Offer Made'    },
  { key: 'contract_sent',            label: 'Contract Sent' },
  { key: 'contract_signed',          label: 'Signed'        },
  { key: 'closed_deal',              label: 'Closed'        },
]

const OVERALL_KPI_ROWS = [
  { key: 'lead',                     label: 'Lead'              },
  { key: 'lead_assigned',            label: 'Lead Assigned'     },
  { key: 'appointment_set',          label: 'Appointment Set'   },
  { key: 'appointment_held',         label: 'Appointment Held'  },
  { key: 'live_transfer_successful', label: 'Live Transfer ✓'   },
  { key: 'offer_made',               label: 'Offer Made'        },
  { key: 'contract_sent',            label: 'Contract Sent'     },
  { key: 'contract_signed',          label: 'Contract Signed'   },
  { key: 'closed_deal',              label: 'Closed Deal'       },
]

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ slices, size = 160, thickness = 28 }: {
  slices: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
}) {
  const total  = slices.reduce((s, sl) => s + sl.value, 0)
  const r      = (size - thickness) / 2
  const cx     = size / 2
  const cy     = size / 2
  const circ   = 2 * Math.PI * r
  let offset   = -Math.PI / 2

  const paths = slices.map((sl, i) => {
    const angle    = (sl.value / total) * 2 * Math.PI
    const x1       = cx + r * Math.cos(offset)
    const y1       = cy + r * Math.sin(offset)
    const x2       = cx + r * Math.cos(offset + angle)
    const y2       = cy + r * Math.sin(offset + angle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
    offset += angle
    return { ...sl, path, angle, i }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map(p => (
        <path
          key={p.i}
          d={p.path}
          fill="none"
          stroke={p.color}
          strokeWidth={thickness - 2}
          strokeLinecap="butt"
          opacity={0.9}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - thickness / 2 + 1} fill={C.card} />
    </svg>
  )
}

// ── Mini horizontal bar ───────────────────────────────────────────────────────

function HBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {label && <span style={{ fontSize: 11, color: C.dimText, width: 60, textAlign: 'right', flexShrink: 0 }}>{label}</span>}
      <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CeoDashboardClient() {
  const bd = C.border

  // ── Totals ───────────────────────────────────────────────────────────────────

  const acqEvents  = useMemo(() => DUMMY_EVENTS.filter(e => e.kpi_type === 'ACQ'),  [])
  const dispoEvents = useMemo(() => DUMMY_EVENTS.filter(e => e.kpi_type === 'DISPO'), [])

  const totalAcqRevenue = useMemo(() =>
    acqEvents.filter(e => e.kpi_name === 'closed_deal').reduce((s, e) => s + (e.potential_profit ?? 0), 0)
  , [acqEvents])

  const totalDispoRevenue = useMemo(() =>
    dispoEvents.filter(e => e.kpi_name === 'closed_deal').reduce((s, e) => s + (e.potential_profit ?? 0), 0)
  , [dispoEvents])

  const totalRevenue = totalAcqRevenue + totalDispoRevenue

  const totalAcqCost  = useMemo(() => Object.values(ACQ_LEAD_SOURCE_COSTS).reduce((s, v) => s + v, 0),  [])
  const totalDispoCost = useMemo(() => Object.values(DISPO_LEAD_SOURCE_COSTS).reduce((s, v) => s + v, 0), [])
  const totalLeadCost  = totalAcqCost + totalDispoCost

  const totalOtherExpenses = useMemo(() => CEO_EXPENSES.reduce((s, e) => s + e.amount, 0), [])
  const totalCost          = totalLeadCost + totalOtherExpenses
  const netProfit          = totalRevenue - totalCost
  const blendedROAS        = totalLeadCost > 0 ? totalRevenue / totalLeadCost : 0

  // ── Table 1: Overall Price Per KPI (ACQ) ─────────────────────────────────────

  const overallKpiRows = useMemo(() => {
    return OVERALL_KPI_ROWS.map(({ key, label }) => {
      const count  = acqEvents.filter(e => e.kpi_name === key).length
      const pricePerKpi  = count > 0 ? totalAcqCost  / count : null
      const profitPerKpi = count > 0 ? totalAcqRevenue / count : null
      const netPerKpi    = pricePerKpi != null && profitPerKpi != null ? profitPerKpi - pricePerKpi : null
      return { key, label, count, pricePerKpi, profitPerKpi, netPerKpi }
    })
  }, [acqEvents, totalAcqCost, totalAcqRevenue])

  // ── Table 2: Price Per KPI Per Lead Source (ACQ) ──────────────────────────────

  const acqSources = useMemo(() =>
    Object.keys(ACQ_LEAD_SOURCE_COSTS).filter(s => acqEvents.some(e => e.lead_source === s))
  , [acqEvents])

  const pricePerKpiBySource = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>()
    for (const src of acqSources) {
      const cost = ACQ_LEAD_SOURCE_COSTS[src] ?? 0
      const kmap = new Map<string, number | null>()
      for (const col of ACQ_KPI_COLS) {
        const cnt = acqEvents.filter(e => e.lead_source === src && e.kpi_name === col.key).length
        kmap.set(col.key, cnt > 0 ? cost / cnt : null)
      }
      const leads = acqEvents.filter(e => e.lead_source === src && e.kpi_name === 'lead').length
      kmap.set('lead_count', leads)
      map.set(src, kmap)
    }
    return map
  }, [acqEvents, acqSources])

  // ── Table 3: Revenue Per KPI Per Lead Source (ACQ) ────────────────────────────

  const revenuePerKpiBySource = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>()
    for (const src of acqSources) {
      const revenue = acqEvents
        .filter(e => e.lead_source === src && e.kpi_name === 'closed_deal')
        .reduce((s, e) => s + (e.potential_profit ?? 0), 0)
      const kmap = new Map<string, number | null>()
      for (const col of ACQ_KPI_COLS) {
        const cnt = acqEvents.filter(e => e.lead_source === src && e.kpi_name === col.key).length
        kmap.set(col.key, cnt > 0 ? revenue / cnt : null)
      }
      map.set(src, kmap)
    }
    return map
  }, [acqEvents, acqSources])

  // ── Table 4: Revenue Per Exit Strategy ───────────────────────────────────────

  const exitStrategyRows = useMemo(() => {
    const map = new Map<string, { deals: number; profit: number }>()
    for (const es of EXIT_STRATEGIES) map.set(es, { deals: 0, profit: 0 })
    for (const e of DUMMY_EVENTS.filter(ev => ev.kpi_name === 'closed_deal')) {
      const es = DUMMY_EXIT_STRATEGIES.get(e.contact_id)
      if (!es) continue
      const row = map.get(es)!
      row.deals  += 1
      row.profit += e.potential_profit ?? 0
    }
    return [...map.entries()]
      .map(([es, d]) => ({ es, ...d, avg: d.deals > 0 ? d.profit / d.deals : 0 }))
      .sort((a, b) => b.profit - a.profit)
  }, [])

  // ── Table 5: DISPO - Cost - Net - ROAS Per Marketing Source ─────────────────

  const dispoSourceRows = useMemo(() => {
    const srcSet = new Set(dispoEvents.filter(e => e.kpi_name === 'closed_deal').map(e => e.lead_source))
    // Also include sources with spend even if no closes
    for (const s of Object.keys(DISPO_LEAD_SOURCE_COSTS)) srcSet.add(s)
    return [...srcSet].map(src => {
      const profit = dispoEvents
        .filter(e => e.lead_source === src && e.kpi_name === 'closed_deal')
        .reduce((s, e) => s + (e.potential_profit ?? 0), 0)
      const cost   = DISPO_LEAD_SOURCE_COSTS[src] ?? 0
      const net    = profit - cost
      const roas   = cost > 0 ? profit / cost : 0
      const leads  = dispoEvents.filter(e => e.lead_source === src && e.kpi_name === 'lead').length
      return { src, profit, cost, net, roas, leads }
    }).sort((a, b) => b.roas - a.roas)
  }, [dispoEvents])

  // ── Chart data ────────────────────────────────────────────────────────────────

  const acqSourceChartData = useMemo(() =>
    acqSources.map(src => {
      const revenue = acqEvents.filter(e => e.lead_source === src && e.kpi_name === 'closed_deal').reduce((s, e) => s + (e.potential_profit ?? 0), 0)
      const cost    = ACQ_LEAD_SOURCE_COSTS[src] ?? 0
      const roas    = cost > 0 ? revenue / cost : 0
      return { src, revenue, cost, roas }
    }).sort((a, b) => b.revenue - a.revenue)
  , [acqEvents, acqSources])

  const exitDonutData = useMemo(() => {
    const COLORS = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22']
    return exitStrategyRows.map((r, i) => ({ label: r.es, value: r.profit || 1, color: COLORS[i % COLORS.length] }))
  }, [exitStrategyRows])

  const costDonutData = useMemo(() => {
    const srcColors = [C.blue, '#4ecdc4', '#45b7d1', C.yellow, '#96ceb4', '#ff6b6b', '#dda0dd', C.green]
    const leadSlices = Object.entries(ACQ_LEAD_SOURCE_COSTS).map(([src, amt], i) => ({
      label: src, value: amt, color: srcColors[i % srcColors.length],
    }))
    const expSlices = CEO_EXPENSES.map((e, i) => ({
      label: e.category, value: e.amount, color: `rgba(255,255,255,${0.15 + i * 0.05})`,
    }))
    return [...leadSlices, ...expSlices]
  }, [])

  const maxRevenue = useMemo(() => Math.max(...acqSourceChartData.map(d => d.revenue), 1), [acqSourceChartData])
  const maxCost    = useMemo(() => Math.max(...acqSourceChartData.map(d => d.cost),    1), [acqSourceChartData])
  const maxROAS    = useMemo(() => Math.max(...dispoSourceRows.map(d => d.roas), 1),       [dispoSourceRows])

  // ── Top stat cards ────────────────────────────────────────────────────────────

  const statCards = [
    { label: 'Total Revenue',       value: fmtK(totalRevenue),      sub: 'From closed deals',         color: C.green,  trend: '+14% vs last mo' },
    { label: 'Total Lead Spend',    value: fmtK(totalLeadCost),     sub: 'All marketing channels',    color: C.blue,   trend: 'ACQ + DISPO' },
    { label: 'Other Expenses',      value: fmtK(totalOtherExpenses),sub: 'Payroll, admin, draws',      color: C.yellow, trend: '6 categories' },
    { label: 'Net Profit',          value: fmtK(netProfit),         sub: 'Revenue − all costs',       color: netColor(netProfit), trend: netProfit > 0 ? 'Profitable' : 'In deficit' },
    { label: 'ROAS',                value: `${blendedROAS.toFixed(2)}×`, sub: 'Revenue ÷ lead spend', color: roasColor(blendedROAS), trend: 'Return on ad spend' },
  ]

  return (
    <div style={{ padding: '32px 32px 60px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: 0 }}>CEO Dashboard</h1>
          <p style={{ fontSize: 13, color: C.dimText, marginTop: 4 }}>Financial overview — revenue, costs, ROAS, and profitability per channel</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(252,175,23,0.08)', border: '1px solid rgba(252,175,23,0.2)', borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: C.yellow, fontWeight: 700, letterSpacing: '0.06em' }}>MOCKUP</span>
          <span style={{ fontSize: 11, color: C.dimText }}>dummy data · replace in Milestone 2</span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 20px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${c.color}, transparent)`, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontSize: 11, color: C.dimText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1, marginBottom: 6 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: C.mutedText }}>{c.sub}</div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.dimText, fontWeight: 600, letterSpacing: '0.04em' }}>{c.trend}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

        {/* Revenue vs Cost by ACQ Source */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px', gridColumn: 'span 2' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>ACQ Revenue vs Cost by Lead Source</div>
          <div style={{ fontSize: 11, color: C.dimText, marginBottom: 20 }}>Revenue from closed deals vs monthly ad spend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {acqSourceChartData.map(d => (
              <div key={d.src}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{d.src}</span>
                  <span style={{ fontSize: 11, color: roasColor(d.roas), fontWeight: 700 }}>ROAS {d.roas.toFixed(1)}×</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.green, width: 44, textAlign: 'right', flexShrink: 0 }}>{fmtK(d.revenue)}</span>
                    <div style={{ flex: 1, height: 9, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.revenue / maxRevenue) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}, #78c97e)`, borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.blue, width: 44, textAlign: 'right', flexShrink: 0 }}>{fmtK(d.cost)}</span>
                    <div style={{ flex: 1, height: 9, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.cost / maxCost) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.blue}, #5b9bd5)`, borderRadius: 4 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 20 }}>
            {[{ color: C.green, label: 'Revenue' }, { color: C.blue, label: 'Ad Spend' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: C.dimText }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown Donut */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>Cost Breakdown</div>
          <div style={{ fontSize: 11, color: C.dimText, marginBottom: 16 }}>Lead spend + other expenses</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ position: 'relative' }}>
              <DonutChart slices={costDonutData} size={150} thickness={30} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.white }}>{fmtK(totalCost)}</span>
                <span style={{ fontSize: 9, color: C.dimText }}>total</span>
              </div>
            </div>
            <div style={{ width: '100%', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'Lead Spend', value: totalLeadCost, color: C.blue },
                { label: 'Payroll',    value: 18000,          color: 'rgba(255,255,255,0.4)' },
                { label: 'Commission', value: 12000,          color: 'rgba(255,255,255,0.3)' },
                { label: 'Draws',      value: 8000,           color: 'rgba(255,255,255,0.2)' },
                { label: 'Admin',      value: 4500,           color: 'rgba(255,255,255,0.15)' },
                { label: 'Other',      value: 4000,           color: 'rgba(255,255,255,0.1)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.dimText }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{fmtK(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Exit Strategy donut + DISPO ROAS ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>

        {/* Exit Strategy Revenue Donut */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>Revenue by Exit Strategy</div>
          <div style={{ fontSize: 11, color: C.dimText, marginBottom: 16 }}>Profit from closed deals</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <DonutChart slices={exitDonutData} size={140} thickness={28} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{fmtK(totalRevenue)}</span>
                <span style={{ fontSize: 9, color: C.dimText }}>total</span>
              </div>
            </div>
            <div style={{ width: '100%', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exitStrategyRows.map((r, i) => {
                const COLORS = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22']
                const color  = COLORS[i % COLORS.length]
                const pct    = totalRevenue > 0 ? (r.profit / totalRevenue * 100).toFixed(0) : '0'
                return (
                  <div key={r.es} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: 11, color: C.dimText }}>{r.es}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{fmtK(r.profit)}</span>
                      <span style={{ fontSize: 10, color: C.dimText, marginLeft: 4 }}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* DISPO ROAS bar chart */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4 }}>DISPO ROAS by Marketing Source</div>
          <div style={{ fontSize: 11, color: C.dimText, marginBottom: 20 }}>Return on ad spend — sorted by performance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dispoSourceRows.slice(0, 10).map(d => (
              <div key={d.src} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: C.text, width: 100, flexShrink: 0, fontWeight: 600 }}>{d.src}</span>
                <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${(d.roas / maxROAS) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${roasColor(d.roas)}, ${roasColor(d.roas)}88)`, borderRadius: 4, transition: 'width 0.4s' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.white }}>{d.roas.toFixed(2)}×</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: C.dimText, width: 60, textAlign: 'right', flexShrink: 0 }}>{fmtK(d.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table 1: Overall Price Per KPI ───────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Overall Price Per KPI</span>
          <span style={{ fontSize: 11, color: C.dimText }}>ACQ — total monthly spend ÷ KPI count</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {['KPI', 'Count', 'Revenue / KPI', 'Cost / KPI', 'Net / KPI', 'Margin'].map(h => (
                  <th key={h} style={{ padding: '10px 20px', textAlign: h === 'KPI' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overallKpiRows.map((row, i) => {
                const margin = row.profitPerKpi != null && row.profitPerKpi > 0 && row.netPerKpi != null
                  ? (row.netPerKpi / row.profitPerKpi) * 100
                  : null
                return (
                  <tr key={row.key} style={{ borderBottom: i < overallKpiRows.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: C.text }}>{row.label}</td>
                    <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{row.count}</td>
                    <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 13, color: C.green, fontWeight: 600 }}>
                      {row.profitPerKpi != null ? fmtK(row.profitPerKpi) : '—'}
                    </td>
                    <td style={{ padding: '11px 20px', textAlign: 'right', fontSize: 13, color: C.blue, fontWeight: 600 }}>
                      {row.pricePerKpi != null ? fmtK(row.pricePerKpi) : '—'}
                    </td>
                    <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                      {row.netPerKpi != null ? (
                        <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 12, fontWeight: 700, background: `${netColor(row.netPerKpi)}18`, color: netColor(row.netPerKpi), border: `1px solid ${netColor(row.netPerKpi)}35` }}>
                          {row.netPerKpi >= 0 ? '+' : ''}{fmtK(row.netPerKpi)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                      {margin != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <div style={{ width: 50, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, margin))}%`, height: '100%', background: netColor(row.netPerKpi!), borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: netColor(row.netPerKpi!), minWidth: 40, textAlign: 'right' }}>{margin.toFixed(0)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table 2: Price Per KPI Per Lead Source ────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Price Per KPI Per Lead Source</span>
          <span style={{ fontSize: 11, color: C.dimText }}>ACQ — $/KPI = monthly source spend ÷ events from that source</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: C.card, zIndex: 2, borderRight: `1px solid ${bd}` }}>Lead Source</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Leads</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Spend</th>
                {ACQ_KPI_COLS.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>$ / {c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acqSources.map((src, idx) => {
                const kmap   = pricePerKpiBySource.get(src)
                const leads  = kmap?.get('lead_count') ?? 0
                const spend  = ACQ_LEAD_SOURCE_COSTS[src] ?? 0
                return (
                  <tr key={src} style={{ borderBottom: idx < acqSources.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 20px', fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, borderRight: `1px solid ${bd}` }}>{src}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: C.mutedText }}>{leads}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: C.yellow, fontWeight: 600 }}>{fmtK(spend)}</td>
                    {ACQ_KPI_COLS.map(c => {
                      const val = kmap?.get(c.key)
                      return (
                        <td key={c.key} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: val != null ? C.blue : C.dimText, fontWeight: val != null ? 600 : 400 }}>
                          {val != null ? fmtK(val) : '—'}
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

      {/* ── Table 3: Revenue Per KPI Per Lead Source ──────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Revenue Per KPI Per Lead Source</span>
          <span style={{ fontSize: 11, color: C.dimText }}>ACQ — revenue/KPI = closed-deal profit from source ÷ KPI count</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: C.card, zIndex: 2, borderRight: `1px solid ${bd}` }}>Lead Source</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Revenue</th>
                {ACQ_KPI_COLS.map(c => (
                  <th key={c.key} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>Rev / {c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {acqSources.map((src, idx) => {
                const kmap   = revenuePerKpiBySource.get(src)
                const rev    = acqEvents.filter(e => e.lead_source === src && e.kpi_name === 'closed_deal').reduce((s, e) => s + (e.potential_profit ?? 0), 0)
                return (
                  <tr key={src} style={{ borderBottom: idx < acqSources.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 20px', fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, borderRight: `1px solid ${bd}` }}>{src}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: C.green }}>{fmtK(rev)}</td>
                    {ACQ_KPI_COLS.map(c => {
                      const val = kmap?.get(c.key)
                      return (
                        <td key={c.key} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: val != null ? C.green : C.dimText, fontWeight: val != null ? 600 : 400 }}>
                          {val != null ? fmtK(val) : '—'}
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

      {/* ── Tables 4 + 5 side by side ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Table 4: Revenue Per Exit Strategy */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Revenue Per Exit Strategy</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {['Exit Strategy', 'Deals', 'Total Profit', 'Avg / Deal', 'Share'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Exit Strategy' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exitStrategyRows.map((row, i) => {
                const COLORS = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22']
                const color  = COLORS[i % COLORS.length]
                const sharePct = totalRevenue > 0 ? (row.profit / totalRevenue * 100) : 0
                return (
                  <tr key={row.es} style={{ borderBottom: i < exitStrategyRows.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{row.es}</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{row.deals}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 13, color: color, fontWeight: 700 }}>{fmtK(row.profit)}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 12, color: C.dimText }}>{fmtK(row.avg)}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <div style={{ width: 40, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${sharePct}%`, height: '100%', background: color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: color, fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{sharePct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Table 5: DISPO - Cost - Net - ROAS Per Marketing Source */}
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>DISPO — Cost · Net · ROAS Per Source</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 360 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['Source', 'Leads', 'Profit', 'Cost', 'Net Profit', 'ROAS'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Source' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispoSourceRows.map((row, i) => (
                  <tr key={row.src} style={{ borderBottom: i < dispoSourceRows.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{row.src}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, color: C.mutedText }}>{row.leads}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, color: C.green, fontWeight: 600 }}>{fmtK(row.profit)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontSize: 12, color: C.yellow, fontWeight: 600 }}>{fmtK(row.cost)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                      <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: `${netColor(row.net)}18`, color: netColor(row.net), border: `1px solid ${netColor(row.net)}30` }}>
                        {row.net >= 0 ? '+' : ''}{fmtK(row.net)}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <div style={{ width: 36, height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${row.cost > 0 ? Math.min((row.roas / maxROAS) * 100, 100) : 0}%`, height: '100%', background: roasColor(row.roas), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: roasColor(row.roas), minWidth: 40, textAlign: 'right' }}>{row.roas.toFixed(2)}×</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Expenses table ───────────────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Monthly Business Expenses</span>
            <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>excluding lead spend · admin-editable in Milestone 2</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>{fmtK(totalOtherExpenses)} total</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${bd}` }}>
              {['Category', 'Monthly Amount', 'Share of Expenses', ''].map(h => (
                <th key={h} style={{ padding: '10px 24px', textAlign: h === 'Category' ? 'left' : h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CEO_EXPENSES.map((exp, i) => {
              const pct = totalOtherExpenses > 0 ? (exp.amount / totalOtherExpenses) * 100 : 0
              return (
                <tr key={exp.category} style={{ borderBottom: i < CEO_EXPENSES.length - 1 ? `1px solid ${bd}` : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 24px', fontSize: 13, fontWeight: 600, color: C.text }}>{exp.category}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: C.red }}>{fmtK(exp.amount)}</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 12, color: C.dimText }}>{pct.toFixed(1)}%</td>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ height: 7, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', minWidth: 120 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.red}88, ${C.red}44)`, borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
