'use client'

import { useState, useMemo } from 'react'
import { Users, Target, TrendingUp, DollarSign } from 'lucide-react'
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
  { key: 'lead',                   label: 'Lead'                   },
  { key: 'lead_assigned',          label: 'Lead Assigned'          },
  { key: 'interested',             label: 'Interested'             },
  { key: 'showing_set',            label: 'Showing Set'            },
  { key: 'showing_held',           label: 'Showing Held'           },
  { key: 'offer_received',         label: 'Offer Received'         },
  { key: 'closed_deal',            label: 'Closed Deal'            },
]

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ color: accent, display: 'flex' }}>{icon}</div>
        <span style={{ fontSize: 11, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: C.white, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.bodyText }}>{sub}</div>}
    </div>
  )
}

function FunnelPanel({ title, stages, events, color }: {
  title: string
  stages: { key: string; label: string }[]
  events: DummyKpiEvent[]
  color: string
}) {
  const counts = stages.map(s => uniqueAt(events, s.key))
  const max = Math.max(counts[0] ?? 0, 1)

  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 20 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((stage, i) => {
          const count = counts[i]
          const prev  = i > 0 ? counts[i - 1] : 0
          const conv  = i > 0 && prev > 0 ? Math.round(count / prev * 100) : null
          const barW  = (count / max) * 100

          return (
            <div key={stage.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.bodyText }}>
                  {stage.label}
                  {conv !== null && (
                    <span style={{ fontSize: 11, color: C.dimText, marginLeft: 6 }}>
                      ({conv}% of prev)
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.white, flexShrink: 0, marginLeft: 12 }}>
                  {count}
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${barW}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────────────────

type TypeFilter = 'All' | 'ACQ' | 'DISPO'

export default function OverviewClient() {
  const [period,     setPeriod]     = useState<DatePeriod>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')

  const filtered = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (typeFilter !== 'All' && e.kpi_type !== typeFilter) return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo, typeFilter])

  const acqFiltered  = useMemo(() => filtered.filter(e => e.kpi_type === 'ACQ'),  [filtered])
  const dispoFiltered = useMemo(() => filtered.filter(e => e.kpi_type === 'DISPO'), [filtered])

  // ── stat card values ───────────────────────────────────
  const totalLeads  = uniqueAt(filtered, 'lead')
  const meetings    = uniqueAt(filtered, 'appointment_set', 'showing_set')
  const closedDeals = uniqueAt(filtered, 'closed_deal')
  const convRate    = totalLeads > 0 ? (closedDeals / totalLeads * 100).toFixed(1) + '%' : '—'

  const totalProfit = filtered
    .filter(e => e.kpi_name === 'closed_deal' && e.potential_profit != null)
    .reduce((sum, e) => sum + (e.potential_profit ?? 0), 0)

  // ── rep table ─────────────────────────────────────────
  const reps = useMemo(() => {
    type RepData = { type: string; leads: Set<string>; meetings: Set<string>; offers: Set<string>; closed: Set<string> }
    const map = new Map<string, RepData>()

    for (const e of filtered) {
      if (!map.has(e.user_name)) {
        map.set(e.user_name, {
          type: e.kpi_type, leads: new Set(), meetings: new Set(), offers: new Set(), closed: new Set(),
        })
      }
      const r = map.get(e.user_name)!
      if (e.kpi_name === 'lead')                                          r.leads.add(e.contact_id)
      if (e.kpi_name === 'appointment_set' || e.kpi_name === 'showing_set') r.meetings.add(e.contact_id)
      if (e.kpi_name === 'offer_made' || e.kpi_name === 'offer_received')   r.offers.add(e.contact_id)
      if (e.kpi_name === 'closed_deal')                                     r.closed.add(e.contact_id)
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        type:     d.type,
        leads:    d.leads.size,
        meetings: d.meetings.size,
        offers:   d.offers.size,
        closed:   d.closed.size,
        conv:     d.leads.size > 0 ? (d.closed.size / d.leads.size * 100).toFixed(1) + '%' : '—',
      }))
      .sort((a, b) => b.closed - a.closed || b.leads - a.leads)
  }, [filtered])

  const borderColor = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>
      {/* ── Page header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>KPI Overview</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Pipeline performance at a glance</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['All', 'ACQ', 'DISPO'] as TypeFilter[]).map(t => {
              const active = typeFilter === t
              const activeBg = t === 'DISPO' ? C.yellow : C.blue
              const activeColor = t === 'DISPO' ? '#0D1C2A' : C.white
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    padding: '7px 18px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: active ? activeBg : 'transparent',
                    color: active ? activeColor : C.mutedText,
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>

          {/* Date picker */}
          <DateRangePicker
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={setPeriod}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard
          icon={<Users size={15} />}
          label="Total Leads"
          value={fmt(totalLeads)}
          sub={typeFilter === 'All'
            ? `ACQ ${uniqueAt(acqFiltered, 'lead')} · DISPO ${uniqueAt(dispoFiltered, 'lead')}`
            : `${typeFilter} pipeline`}
          accent={C.blue}
        />
        <StatCard
          icon={<Target size={15} />}
          label="Meetings Scheduled"
          value={fmt(meetings)}
          sub={typeFilter === 'All'
            ? `Appts ${uniqueAt(acqFiltered, 'appointment_set')} · Showings ${uniqueAt(dispoFiltered, 'showing_set')}`
            : typeFilter === 'ACQ' ? 'Appointments set' : 'Showings set'}
          accent={C.blue}
        />
        <StatCard
          icon={<DollarSign size={15} />}
          label="Closed Deals"
          value={fmt(closedDeals)}
          sub={totalProfit > 0
            ? `$${(totalProfit / 1000).toFixed(0)}K total potential profit`
            : 'No closings yet'}
          accent={C.green}
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label="Lead → Close Rate"
          value={convRate}
          sub={`${closedDeals} of ${totalLeads} leads closed`}
          accent={C.yellow}
        />
      </div>

      {/* ── Funnel panels ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {typeFilter !== 'DISPO' && (
          <FunnelPanel
            title="ACQ Funnel"
            stages={ACQ_STAGES}
            events={acqFiltered}
            color={C.blue}
          />
        )}
        {typeFilter !== 'ACQ' && (
          <FunnelPanel
            title="DISPO Funnel"
            stages={DISPO_STAGES}
            events={dispoFiltered}
            color={C.yellow}
          />
        )}
      </div>

      {/* ── Rep performance table ────────────────────────── */}
      {reps.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${borderColor}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderColor}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Rep Performance</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                  {['Rep', 'Type', 'Leads', 'Meetings', 'Offers', 'Closed', 'Conv %'].map(h => (
                    <th key={h} style={{
                      padding: '10px 20px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: C.dimText,
                      textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reps.map((rep, i) => (
                  <tr
                    key={rep.name}
                    style={{ borderBottom: i < reps.length - 1 ? `1px solid ${borderColor}` : undefined }}
                  >
                    <td style={{ padding: '13px 20px', fontSize: 14, color: C.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {rep.name}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 5,
                        background: rep.type === 'ACQ' ? 'rgba(48,125,192,0.15)' : 'rgba(252,175,23,0.15)',
                        color: rep.type === 'ACQ' ? C.blue : C.yellow,
                        letterSpacing: '0.05em',
                      }}>
                        {rep.type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 14, color: C.text }}>{rep.leads}</td>
                    <td style={{ padding: '13px 20px', fontSize: 14, color: C.text }}>{rep.meetings}</td>
                    <td style={{ padding: '13px 20px', fontSize: 14, color: C.text }}>{rep.offers}</td>
                    <td style={{ padding: '13px 20px', fontSize: 14, fontWeight: rep.closed > 0 ? 700 : 400, color: rep.closed > 0 ? C.green : C.mutedText }}>
                      {rep.closed}
                    </td>
                    <td style={{ padding: '13px 20px', fontSize: 14, color: C.mutedText }}>{rep.conv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dummy data notice ────────────────────────────── */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <span style={{
          fontSize: 11, color: C.dimText, background: 'rgba(252,175,23,0.07)',
          border: '1px solid rgba(252,175,23,0.15)', borderRadius: 6,
          padding: '5px 12px', letterSpacing: '0.04em',
        }}>
          MOCKUP — dummy data · replace with Supabase query in Milestone 2
        </span>
      </div>
    </div>
  )
}
