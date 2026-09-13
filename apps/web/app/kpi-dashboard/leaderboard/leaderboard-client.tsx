'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS } from '../dummy-data'
import SourcePicker from '../source-picker'

// ── types ─────────────────────────────────────────────────────────────────────

type TypeFilter = 'All' | 'ACQ' | 'DISPO'
type SortKey    = 'name' | 'leads' | 'meetings' | 'offers' | 'contracts' | 'closed' | 'conv' | 'profit'
type SortDir    = 'asc' | 'desc'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString() }
function fmtK(n: number) { return n === 0 ? '$0' : `$${(n / 1000).toFixed(0)}K` }

// ── columns config ────────────────────────────────────────────────────────────

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name',      label: 'Rep',           align: 'left'  },
  { key: 'leads',     label: 'Leads',         align: 'right' },
  { key: 'meetings',  label: 'Meetings',      align: 'right' },
  { key: 'offers',    label: 'Offers',        align: 'right' },
  { key: 'contracts', label: 'Contracts',     align: 'right' },
  { key: 'closed',    label: 'Closed',        align: 'right' },
  { key: 'conv',      label: 'Lead to Close', align: 'right' },
  { key: 'profit',    label: 'Potential Profit', align: 'right' },
]

// ── main ──────────────────────────────────────────────────────────────────────

export default function LeaderboardClient() {
  const [period,     setPeriod]     = useState<DatePeriod>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All')
  const [leadSource, setLeadSource] = useState('')
  const [sortBy,     setSortBy]     = useState<SortKey>('closed')
  const [sortDir,    setSortDir]    = useState<SortDir>('desc')

  const allLeadSources = useMemo(() =>
    [...new Set(DUMMY_EVENTS.filter(e => e.kpi_name === 'lead').map(e => e.lead_source))].sort()
  , [])

  const filtered = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return DUMMY_EVENTS.filter(e => {
      if (typeFilter !== 'All' && e.kpi_type !== typeFilter) return false
      if (leadSource && e.lead_source !== leadSource) return false
      const d = new Date(e.occurred_at)
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [period, customFrom, customTo, typeFilter, leadSource])

  // Build per-rep rows
  const rows = useMemo(() => {
    type R = {
      type: 'ACQ' | 'DISPO'
      leads:     Set<string>
      meetings:  Set<string>
      offers:    Set<string>
      contracts: Set<string>
      closed:    Set<string>
      profit:    number
    }
    const map = new Map<string, R>()

    for (const e of filtered) {
      if (!map.has(e.user_name)) {
        map.set(e.user_name, {
          type: e.kpi_type,
          leads: new Set(), meetings: new Set(), offers: new Set(),
          contracts: new Set(), closed: new Set(), profit: 0,
        })
      }
      const r = map.get(e.user_name)!

      if (e.kpi_name === 'lead') r.leads.add(e.contact_id)

      // meetings: appointment_set for ACQ, showing_set for DISPO
      if (e.kpi_name === 'appointment_set' || e.kpi_name === 'showing_set')
        r.meetings.add(e.contact_id)

      // offers: offer_made for ACQ, offer_received for DISPO
      if (e.kpi_name === 'offer_made' || e.kpi_name === 'offer_received')
        r.offers.add(e.contact_id)

      if (e.kpi_name === 'contract_signed') r.contracts.add(e.contact_id)

      if (e.kpi_name === 'closed_deal') {
        r.closed.add(e.contact_id)
        if (e.potential_profit) r.profit += e.potential_profit
      }
    }

    return Array.from(map.entries()).map(([name, d]) => ({
      name,
      type:      d.type,
      leads:     d.leads.size,
      meetings:  d.meetings.size,
      offers:    d.offers.size,
      contracts: d.contracts.size,
      closed:    d.closed.size,
      conv:      d.leads.size > 0 ? (d.closed.size / d.leads.size) * 100 : 0,
      profit:    d.profit,
    }))
  }, [filtered])

  // Sort
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let diff: number
      if (sortBy === 'name') {
        diff = a.name.localeCompare(b.name)
      } else if (sortBy === 'conv') {
        diff = a.conv - b.conv
      } else {
        diff = (a[sortBy] as number) - (b[sortBy] as number)
      }
      return sortDir === 'asc' ? diff : -diff
    })
  }, [rows, sortBy, sortDir])

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  // Summary totals
  const totals = useMemo(() => ({
    leads:     rows.reduce((s, r) => s + r.leads,     0),
    meetings:  rows.reduce((s, r) => s + r.meetings,  0),
    offers:    rows.reduce((s, r) => s + r.offers,    0),
    contracts: rows.reduce((s, r) => s + r.contracts, 0),
    closed:    rows.reduce((s, r) => s + r.closed,    0),
    profit:    rows.reduce((s, r) => s + r.profit,    0),
  }), [rows])

  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, margin: 0 }}>Leaderboard</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Rep performance across ACQ and DISPO</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['All', 'ACQ', 'DISPO'] as TypeFilter[]).map(t => {
              const active    = typeFilter === t
              const activeBg  = t === 'DISPO' ? C.yellow : C.blue
              const activeClr = t === 'DISPO' ? '#0D1C2A' : C.white
              return (
                <button key={t} onClick={() => setTypeFilter(t)} style={{
                  padding: '7px 16px', fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: active ? activeBg  : 'transparent',
                  color:      active ? activeClr : C.mutedText,
                }}>
                  {t}
                </button>
              )
            })}
          </div>

          <SourcePicker value={leadSource} options={allLeadSources} onChange={setLeadSource} />

          <DateRangePicker
            period={period} customFrom={customFrom} customTo={customTo}
            onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Leads',   value: fmt(totals.leads)     },
          { label: 'Meetings',      value: fmt(totals.meetings)   },
          { label: 'Offers',        value: fmt(totals.offers)     },
          { label: 'Closed Deals',  value: fmt(totals.closed)     },
          { label: 'Potential Profit', value: fmtK(totals.profit) },
        ].map(c => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              {c.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.white, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Leaderboard table ────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {/* Rank column */}
                <th style={{
                  width: 48, padding: '11px 16px', textAlign: 'center',
                  fontSize: 11, fontWeight: 700, color: C.dimText,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>#</th>

                {COLUMNS.map(col => {
                  const active = sortBy === col.key
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        padding: '11px 18px',
                        textAlign: col.align,
                        fontSize: 11, fontWeight: 700,
                        color: active ? C.white : C.dimText,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        whiteSpace: 'nowrap', cursor: 'pointer',
                        userSelect: 'none', transition: 'color 0.15s',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {active
                          ? sortDir === 'desc'
                            ? <ChevronDown size={12} />
                            : <ChevronUp   size={12} />
                          : <ChevronDown size={12} style={{ opacity: 0.2 }} />
                        }
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ padding: '32px', textAlign: 'center', fontSize: 13, color: C.dimText }}>
                    No data for this filter combination
                  </td>
                </tr>
              )}

              {sorted.map((rep, i) => {
                const rank     = i + 1
                const isTop3   = rank <= 3
                const accentBg = rep.type === 'ACQ'
                  ? 'rgba(48,125,192,0.12)'
                  : 'rgba(252,175,23,0.12)'
                const accentCl = rep.type === 'ACQ' ? C.blue : C.yellow

                return (
                  <tr
                    key={rep.name}
                    style={{
                      borderBottom: i < sorted.length - 1 ? `1px solid ${bd}` : undefined,
                      background: isTop3 ? 'rgba(255,255,255,0.015)' : undefined,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(255,255,255,0.015)' : 'transparent')}
                  >
                    {/* Rank */}
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      {isTop3 ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800,
                          background: rank === 1 ? '#b45309' : rank === 2 ? '#475569' : '#78350f',
                          color: rank === 1 ? '#fde68a' : rank === 2 ? '#cbd5e1' : '#fcd34d',
                        }}>
                          {rank}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.dimText, fontWeight: 600 }}>{rank}</span>
                      )}
                    </td>

                    {/* Rep name */}
                    <td style={{ padding: '13px 18px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{rep.name}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
                          background: accentBg, color: accentCl, letterSpacing: '0.05em',
                        }}>
                          {rep.type}
                        </span>
                      </div>
                    </td>

                    {/* Numeric cols */}
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontSize: 14, color: C.text }}>{fmt(rep.leads)}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontSize: 14, color: C.text }}>{fmt(rep.meetings)}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontSize: 14, color: C.text }}>{fmt(rep.offers)}</td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', fontSize: 14, color: C.text }}>{fmt(rep.contracts)}</td>

                    {/* Closed */}
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <span style={{
                        fontSize: 14, fontWeight: rep.closed > 0 ? 700 : 400,
                        color: rep.closed > 0 ? C.green : C.mutedText,
                      }}>
                        {fmt(rep.closed)}
                      </span>
                    </td>

                    {/* Conv % */}
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <span style={{ fontSize: 14, color: rep.conv > 0 ? C.bodyText : C.mutedText }}>
                        {rep.conv > 0 ? rep.conv.toFixed(1) + '%' : '0%'}
                      </span>
                    </td>

                    {/* Profit */}
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <span style={{ fontSize: 14, color: rep.profit > 0 ? C.green : C.mutedText }}>
                        {fmtK(rep.profit)}
                      </span>
                    </td>
                  </tr>
                )
              })}
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
