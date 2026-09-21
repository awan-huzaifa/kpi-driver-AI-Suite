'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { C } from '@/components/platform/brand'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'
import { DUMMY_EVENTS } from '../dummy-data'
import SourcePicker from '../source-picker'

type TypeFilter = 'All' | 'ACQ' | 'DISPO'
type SortKey    = 'name' | 'leads' | 'meetings' | 'offers' | 'contracts' | 'closed' | 'conv' | 'profit'
type SortDir    = 'asc' | 'desc'

function fmt(n: number) { return n.toLocaleString() }
function fmtK(n: number) { return n === 0 ? '$0' : `$${(n / 1000).toFixed(0)}K` }

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name',      label: 'Rep',             align: 'left'  },
  { key: 'leads',     label: 'Leads',           align: 'right' },
  { key: 'meetings',  label: 'Meetings',        align: 'right' },
  { key: 'offers',    label: 'Offers',          align: 'right' },
  { key: 'contracts', label: 'Contracts',       align: 'right' },
  { key: 'closed',    label: 'Closed',          align: 'right' },
  { key: 'conv',      label: 'Lead → Close',    align: 'right' },
  { key: 'profit',    label: 'Profit',          align: 'right' },
]

const AVATAR_PALETTE = [C.blue, C.green, C.yellow, '#9b59b6', '#e67e22', '#e84393', '#1abc9c', '#e74c3c', '#3498db', '#2ecc71']

const RANK_META = [
  { bg: '#b45309', color: '#fde68a', border: 'rgba(255,215,0,0.4)',   label: '1st', trophy: '🥇' },
  { bg: '#475569', color: '#cbd5e1', border: 'rgba(192,192,192,0.4)', label: '2nd', trophy: '🥈' },
  { bg: '#78350f', color: '#fcd34d', border: 'rgba(205,127,50,0.4)',  label: '3rd', trophy: '🥉' },
]

// ── Podium component ──────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: { name: string; type: string; closed: number; conv: number; profit: number; leads: number }[] }) {
  if (top3.length === 0) return null

  const order = [1, 0, 2].filter(i => top3[i] != null) // silver, gold, bronze display order
  const heights = [110, 150, 80]   // podium block heights in display order (silver, gold, bronze)
  const blockColors = [
    'linear-gradient(180deg, rgba(192,192,192,0.18) 0%, rgba(192,192,192,0.06) 100%)',
    'linear-gradient(180deg, rgba(255,215,0,0.22)   0%, rgba(255,215,0,0.06)   100%)',
    'linear-gradient(180deg, rgba(205,127,50,0.18)  0%, rgba(205,127,50,0.06)  100%)',
  ]
  const blockBorders = ['rgba(192,192,192,0.3)', 'rgba(255,215,0,0.4)', 'rgba(205,127,50,0.3)']
  const textColors   = ['#C0C0C0', '#FFD700', '#CD7F32']

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '28px 28px 0', marginBottom: 22, position: 'relative', overflow: 'hidden' }}>
      {/* background glow */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 28 }}>Top Performers</div>

      {/* Podium */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
        {order.map((repIdx, displayPos) => {
          const rep   = top3[repIdx]
          if (!rep) return null
          const rm    = RANK_META[repIdx]
          const h     = heights[displayPos]
          const bgl   = blockColors[displayPos]
          const border = blockBorders[displayPos]
          const tc    = textColors[displayPos]
          const avBg  = AVATAR_PALETTE[repIdx % AVATAR_PALETTE.length]
          const initials = rep.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
          const convColor = rep.conv >= 10 ? C.green : rep.conv >= 5 ? C.yellow : C.red

          return (
            <div key={rep.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: 200 }}>
              {/* Rep info above block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                {/* Trophy */}
                <span style={{ fontSize: 22 }}>{rm.trophy}</span>
                {/* Avatar */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${avBg}22`, border: `2px solid ${avBg}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: avBg }}>
                  {initials}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.white, textAlign: 'center', lineHeight: 1.2 }}>{rep.name}</div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: rep.type === 'ACQ' ? 'rgba(48,125,192,0.18)' : 'rgba(252,175,23,0.18)', color: rep.type === 'ACQ' ? C.blue : C.yellow, letterSpacing: '0.05em' }}>{rep.type}</span>
              </div>

              {/* Podium block */}
              <div style={{ width: '100%', height: h, background: bgl, border: `1px solid ${border}`, borderRadius: '10px 10px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '16px 12px', gap: 8 }}>
                {/* Rank label */}
                <div style={{ fontSize: 18, fontWeight: 900, color: tc, lineHeight: 1 }}>{rm.label}</div>

                {/* Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.dimText }}>Closed</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: tc }}>{rep.closed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: C.dimText }}>Conv</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: convColor }}>{rep.conv.toFixed(1)}%</span>
                  </div>
                  {displayPos === 1 && ( // only show profit on 1st place (tallest)
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: C.dimText }}>Profit</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{fmtK(rep.profit)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

  const rows = useMemo(() => {
    type R = { type: 'ACQ' | 'DISPO'; leads: Set<string>; meetings: Set<string>; offers: Set<string>; contracts: Set<string>; closed: Set<string>; profit: number }
    const map = new Map<string, R>()
    for (const e of filtered) {
      if (!map.has(e.user_name)) map.set(e.user_name, { type: e.kpi_type, leads: new Set(), meetings: new Set(), offers: new Set(), contracts: new Set(), closed: new Set(), profit: 0 })
      const r = map.get(e.user_name)!
      if (e.kpi_name === 'lead') r.leads.add(e.contact_id)
      if (e.kpi_name === 'appointment_set' || e.kpi_name === 'showing_set')  r.meetings.add(e.contact_id)
      if (e.kpi_name === 'offer_made'      || e.kpi_name === 'offer_received') r.offers.add(e.contact_id)
      if (e.kpi_name === 'contract_signed') r.contracts.add(e.contact_id)
      if (e.kpi_name === 'closed_deal')   { r.closed.add(e.contact_id); if (e.potential_profit) r.profit += e.potential_profit }
    }
    return Array.from(map.entries()).map(([name, d]) => ({
      name, type: d.type,
      leads:     d.leads.size,
      meetings:  d.meetings.size,
      offers:    d.offers.size,
      contracts: d.contracts.size,
      closed:    d.closed.size,
      conv:      d.leads.size > 0 ? (d.closed.size / d.leads.size) * 100 : 0,
      profit:    d.profit,
    }))
  }, [filtered])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'conv' ? a.conv - b.conv : (a[sortBy] as number) - (b[sortBy] as number)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [rows, sortBy, sortDir])

  const totals = useMemo(() => ({
    leads: rows.reduce((s,r) => s+r.leads,0), meetings: rows.reduce((s,r) => s+r.meetings,0),
    offers: rows.reduce((s,r) => s+r.offers,0), contracts: rows.reduce((s,r) => s+r.contracts,0),
    closed: rows.reduce((s,r) => s+r.closed,0), profit: rows.reduce((s,r) => s+r.profit,0),
  }), [rows])

  const maxes = useMemo(() => ({
    leads:     Math.max(...rows.map(r => r.leads),     1),
    meetings:  Math.max(...rows.map(r => r.meetings),  1),
    offers:    Math.max(...rows.map(r => r.offers),    1),
    contracts: Math.max(...rows.map(r => r.contracts), 1),
    closed:    Math.max(...rows.map(r => r.closed),    1),
    profit:    Math.max(...rows.map(r => r.profit),    1),
  }), [rows])

  // Top 3 by closed (default sort)
  const top3 = useMemo(() => [...rows].sort((a,b) => b.closed - a.closed || b.leads - a.leads).slice(0, 3), [rows])

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('desc') }
  }

  function achievementBadges(rep: typeof rows[0]): { label: string; color: string }[] {
    const b: { label: string; color: string }[] = []
    if (rep.closed  >= 5)  b.push({ label: '5+ Closed',     color: C.green  })
    if (rep.conv    >= 10) b.push({ label: '10%+ Conv',      color: C.blue   })
    if (rep.profit  >= 50000) b.push({ label: '$50K+',       color: '#9b59b6' })
    if (rep.leads   >= 30) b.push({ label: '30+ Leads',      color: C.yellow })
    if (rep.meetings >= 15) b.push({ label: '15+ Meetings',  color: '#e67e22' })
    return b
  }

  const CARD_COLORS = [C.blue, '#4ecdc4', C.yellow, C.green, '#9b59b6']
  const bd = C.border

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, margin: 0 }}>Leaderboard</h1>
          <p style={{ fontSize: 13, color: C.mutedText, margin: '4px 0 0' }}>Rep performance across ACQ and DISPO</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['All', 'ACQ', 'DISPO'] as TypeFilter[]).map(t => {
              const active = typeFilter === t
              const bg = t === 'DISPO' ? C.yellow : C.blue
              const cl = t === 'DISPO' ? '#0D1C2A' : C.white
              return (
                <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: active ? bg : 'transparent', color: active ? cl : C.mutedText }}>{t}</button>
              )
            })}
          </div>
          <SourcePicker value={leadSource} options={allLeadSources} onChange={setLeadSource} />
          <DateRangePicker period={period} customFrom={customFrom} customTo={customTo} onPeriod={setPeriod} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo} />
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total Leads',    value: fmt(totals.leads),     color: C.blue    },
          { label: 'Meetings',       value: fmt(totals.meetings),  color: '#4ecdc4' },
          { label: 'Offers',         value: fmt(totals.offers),    color: C.yellow  },
          { label: 'Closed Deals',   value: fmt(totals.closed),    color: C.green   },
          { label: 'Total Profit',   value: fmtK(totals.profit),   color: '#9b59b6' },
        ].map((c, i) => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${CARD_COLORS[i]}, transparent)` }} />
            <div style={{ fontSize: 10, color: C.mutedText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Podium ──────────────────────────────────────────────── */}
      <Podium top3={top3} />

      {/* ── Leaderboard table ────────────────────────────────────── */}
      <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                <th style={{ width: 48, padding: '11px 16px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em' }}>#</th>
                {COLUMNS.map(col => {
                  const active = sortBy === col.key
                  return (
                    <th key={col.key} onClick={() => handleSort(col.key)} style={{ padding: '11px 16px', textAlign: col.align, fontSize: 10, fontWeight: 700, color: active ? C.white : C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', transition: 'color 0.15s' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {active ? sortDir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} /> : <ChevronDown size={11} style={{ opacity: 0.2 }} />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={COLUMNS.length + 1} style={{ padding: 32, textAlign: 'center', fontSize: 13, color: C.dimText }}>No data for this filter combination</td></tr>
              )}
              {sorted.map((rep, i) => {
                const rank      = i + 1
                const isTop3    = rank <= 3
                const rm        = RANK_META[i]
                const avBg      = AVATAR_PALETTE[i % AVATAR_PALETTE.length]
                const initials  = rep.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
                const convColor = rep.conv >= 10 ? C.green : rep.conv >= 5 ? C.yellow : C.dimText
                const badges    = achievementBadges(rep)

                return (
                  <tr key={rep.name}
                    style={{ borderBottom: i < sorted.length - 1 ? `1px solid ${bd}` : undefined, background: isTop3 ? 'rgba(255,255,255,0.012)' : undefined, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.028)')}
                    onMouseLeave={e => (e.currentTarget.style.background = isTop3 ? 'rgba(255,255,255,0.012)' : 'transparent')}
                  >
                    {/* Rank */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {isTop3 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 800, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>{rank}</span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.dimText, fontWeight: 600 }}>{rank}</span>
                      )}
                    </td>

                    {/* Rep name + type + badges */}
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${avBg}20`, border: `1px solid ${avBg}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: avBg, flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{rep.name}</span>
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: rep.type === 'ACQ' ? 'rgba(48,125,192,0.15)' : 'rgba(252,175,23,0.15)', color: rep.type === 'ACQ' ? C.blue : C.yellow, letterSpacing: '0.04em' }}>{rep.type}</span>
                          </div>
                          {badges.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {badges.map(b => (
                                <span key={b.label} style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}25`, letterSpacing: '0.02em' }}>{b.label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Leads + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, color: C.text }}>{fmt(rep.leads)}</span>
                        <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.leads / maxes.leads) * 100}%`, height: '100%', background: C.blue, borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>

                    {/* Meetings + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, color: C.text }}>{fmt(rep.meetings)}</span>
                        <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.meetings / maxes.meetings) * 100}%`, height: '100%', background: '#4ecdc4', borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>

                    {/* Offers + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, color: C.text }}>{fmt(rep.offers)}</span>
                        <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.offers / maxes.offers) * 100}%`, height: '100%', background: C.yellow, borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>

                    {/* Contracts + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, color: C.text }}>{fmt(rep.contracts)}</span>
                        <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.contracts / maxes.contracts) * 100}%`, height: '100%', background: '#f97316', borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>

                    {/* Closed — bold + green + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: rep.closed > 0 ? 800 : 400, color: rep.closed > 0 ? C.green : C.dimText }}>{fmt(rep.closed)}</span>
                        <div style={{ width: 44, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.closed / maxes.closed) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.green}, ${C.green}77)`, borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>

                    {/* Conv% pill */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: `${convColor}15`, color: convColor, border: `1px solid ${convColor}28` }}>
                        {rep.conv > 0 ? rep.conv.toFixed(1) + '%' : '0%'}
                      </span>
                    </td>

                    {/* Profit + bar */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: rep.profit > 0 ? C.green : C.dimText }}>{fmtK(rep.profit)}</span>
                        <div style={{ width: 44, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ width: `${(rep.profit / maxes.profit) * 100}%`, height: '100%', background: '#9b59b6', borderRadius: 2 }} />
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

    </div>
  )
}
