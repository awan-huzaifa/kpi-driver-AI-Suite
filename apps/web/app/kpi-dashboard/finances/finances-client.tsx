'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function fmt$(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

// ── Input cell ────────────────────────────────────────────────────────────────

function DollarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: focused ? 'rgba(48,125,192,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${focused ? C.blue : 'rgba(255,255,255,0.08)'}`, borderRadius: 7, padding: '6px 10px', width: 120, transition: 'all 0.15s' }}>
      <span style={{ fontSize: 12, color: C.dimText }}>$</span>
      <input
        type="text"
        inputMode="numeric"
        value={focused ? raw : fmt$(value)}
        onFocus={() => { setFocused(true); setRaw(String(value)) }}
        onBlur={() => { setFocused(false); onChange(parseNum(raw)) }}
        onChange={e => setRaw(e.target.value)}
        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: C.white, width: '100%' }}
      />
    </div>
  )
}

// ── Save toast ────────────────────────────────────────────────────────────────

function SaveToast({ show, onHide }: { show: boolean; onHide: () => void }) {
  if (!show) return null
  return (
    <div
      onClick={onHide}
      style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 999, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', background: '#0d2a1a', border: `1px solid ${C.green}40`, borderRadius: 12, cursor: 'pointer', boxShadow: `0 4px 24px rgba(67,183,73,0.18)` }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7.5" stroke={C.green} strokeWidth="1" />
        <path d="M4.5 8.5 L7 11 L11.5 5.5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Changes saved (mock)</div>
        <div style={{ fontSize: 11, color: C.dimText, marginTop: 1 }}>Persists to Supabase in Milestone 2 · click to dismiss</div>
      </div>
    </div>
  )
}

// ── Dropdown picker (month / year) ───────────────────────────────────────────

function DropdownPicker({ value, options, onChange }: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
          background: open ? 'rgba(48,125,192,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(48,125,192,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: C.text, fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s', whiteSpace: 'nowrap',
          boxShadow: open ? '0 0 0 2px rgba(48,125,192,0.1)' : 'none',
        }}
      >
        {value}
        <ChevronDown size={13} style={{ color: C.dimText, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#0b1929', border: '1px solid rgba(48,125,192,0.25)',
          borderRadius: 10, padding: '5px', minWidth: '100%',
          boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', borderRadius: 7, border: 'none',
                background: opt === value ? 'rgba(48,125,192,0.18)' : 'transparent',
                color: opt === value ? C.blue : '#94a3b8',
                fontSize: 13, fontWeight: opt === value ? 700 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (opt !== value) e.currentTarget.style.background = 'rgba(48,125,192,0.1)' }}
              onMouseLeave={e => { if (opt !== value) e.currentTarget.style.background = 'transparent' }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab pill ──────────────────────────────────────────────────────────────────

function TabPill({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, border: active ? `1px solid ${C.blue}55` : '1px solid transparent', background: active ? `rgba(48,125,192,0.12)` : 'transparent', color: active ? C.blue : C.dimText, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: active ? `${C.blue}30` : 'rgba(255,255,255,0.06)', color: active ? C.blue : C.dimText }}>{count}</span>
      )}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinancesClient() {
  const bd = C.border

  const [tab, setTab]         = useState<'acq' | 'dispo' | 'expenses' | 'deals'>('acq')
  const [month, setMonth]     = useState(MONTHS[new Date().getMonth()])
  const [year, setYear]       = useState(String(new Date().getFullYear()))
  const [toast, setToast]     = useState(false)

  // ── editable state ───────────────────────────────────────────────────────────
  const [acqCosts, setAcqCosts]     = useState<Record<string, number>>({ ...ACQ_LEAD_SOURCE_COSTS })
  const [dispoCosts, setDispoCosts] = useState<Record<string, number>>({ ...DISPO_LEAD_SOURCE_COSTS })
  const [expenses, setExpenses]     = useState<{ category: string; amount: number }[]>(
    CEO_EXPENSES.map(e => ({ ...e }))
  )

  const closedDeals = useMemo(() =>
    DUMMY_EVENTS.filter(e => e.kpi_name === 'closed_deal')
      .map(e => ({ ...e, profit: e.potential_profit ?? 0 }))
  , [])

  const [dealProfits, setDealProfits] = useState<Record<string, number>>(
    Object.fromEntries(closedDeals.map(d => [d.id, d.profit]))
  )

  // ── derived ──────────────────────────────────────────────────────────────────
  const acqLeadCounts  = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of DUMMY_EVENTS.filter(ev => ev.kpi_type === 'ACQ' && ev.kpi_name === 'lead')) {
      m.set(e.lead_source, (m.get(e.lead_source) ?? 0) + 1)
    }
    return m
  }, [])

  const dispoLeadCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of DUMMY_EVENTS.filter(ev => ev.kpi_type === 'DISPO' && ev.kpi_name === 'lead')) {
      m.set(e.lead_source, (m.get(e.lead_source) ?? 0) + 1)
    }
    return m
  }, [])

  const totalAcqSpend   = Object.values(acqCosts).reduce((s, v) => s + v, 0)
  const totalDispoSpend = Object.values(dispoCosts).reduce((s, v) => s + v, 0)
  const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0)
  const totalDealProfit = Object.values(dealProfits).reduce((s, v) => s + v, 0)

  function handleSave() {
    // In M2: POST to /api/kpi/finances with { month, year, acqCosts, dispoCosts, expenses, dealProfits }
    setToast(true)
    setTimeout(() => setToast(false), 5000)
  }

  const YEAR_OPTIONS = ['2024', '2025', '2026']

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, margin: 0 }}>Finance Input</h1>
          <p style={{ fontSize: 13, color: C.dimText, marginTop: 4 }}>Accountant / admin panel — log monthly costs, expenses, and deal profits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Month + year picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <DropdownPicker value={month} options={MONTHS}        onChange={setMonth} />
            <DropdownPicker value={year}  options={YEAR_OPTIONS}  onChange={setYear}  />
          </div>
          {/* Save */}
          <button
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: `linear-gradient(135deg, ${C.blue}, #2567a0)`, border: 'none', borderRadius: 10, color: C.white, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: `0 2px 12px ${C.blue}44` }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5L5.5 11L12 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Save Changes
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(252,175,23,0.08)', border: '1px solid rgba(252,175,23,0.2)', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: C.yellow, fontWeight: 700 }}>MOCKUP</span>
          </div>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'ACQ Lead Spend',    value: `$${fmt$(totalAcqSpend)}`,   color: C.blue,   sub: `${Object.keys(acqCosts).length} sources`          },
          { label: 'DISPO Lead Spend',  value: `$${fmt$(totalDispoSpend)}`, color: '#4ecdc4', sub: `${Object.keys(dispoCosts).length} sources`        },
          { label: 'Other Expenses',    value: `$${fmt$(totalExpenses)}`,   color: C.yellow, sub: `${expenses.length} categories`                    },
          { label: 'Total Deal Profit', value: `$${fmt$(totalDealProfit)}`, color: C.green,  sub: `${closedDeals.length} closed deals this month`    },
        ].map(c => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${c.color}, transparent)`, borderRadius: '12px 12px 0 0' }} />
            <div style={{ fontSize: 11, color: C.dimText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: C.dimText, marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '8px', background: C.card, border: `1px solid ${bd}`, borderRadius: 12, width: 'fit-content' }}>
        <TabPill label="ACQ Lead Costs"   active={tab === 'acq'}      count={Object.keys(acqCosts).length}   onClick={() => setTab('acq')} />
        <TabPill label="DISPO Lead Costs" active={tab === 'dispo'}    count={Object.keys(dispoCosts).length} onClick={() => setTab('dispo')} />
        <TabPill label="Business Expenses" active={tab === 'expenses'} count={expenses.length}               onClick={() => setTab('expenses')} />
        <TabPill label="Deal Profits"     active={tab === 'deals'}    count={closedDeals.length}             onClick={() => setTab('deals')} />
      </div>

      {/* ── ACQ Lead Costs ────────────────────────────────────────────────── */}
      {tab === 'acq' && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>ACQ Lead Source Costs</span>
              <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>Monthly ad spend per acquisition channel · {month} {year}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>Total: ${fmt$(totalAcqSpend)}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {['Lead Source', 'Monthly Spend', 'Leads This Month', 'Cost Per Lead', 'Share of Spend', ''].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: h === 'Lead Source' ? 'left' : h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(acqCosts).map(([src, amt], i, arr) => {
                const leads = acqLeadCounts.get(src) ?? 0
                const cpl   = leads > 0 ? amt / leads : null
                const pct   = totalAcqSpend > 0 ? (amt / totalAcqSpend) * 100 : 0
                return (
                  <tr key={src} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: C.blue, opacity: 0.7 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{src}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <DollarInput value={amt} onChange={v => setAcqCosts(p => ({ ...p, [src]: v }))} />
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{leads}</td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: cpl != null ? C.yellow : C.dimText }}>
                      {cpl != null ? `$${fmt$(cpl)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.blue}, ${C.blue}88)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      <span style={{ fontSize: 10, color: C.dimText, fontStyle: 'italic' }}>editable</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${bd}`, background: 'rgba(48,125,192,0.04)' }}>
                <td style={{ padding: '12px 24px', fontSize: 13, fontWeight: 700, color: C.text }}>Total</td>
                <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: C.blue }}>${fmt$(totalAcqSpend)}</td>
                <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{[...acqLeadCounts.values()].reduce((s, v) => s + v, 0)}</td>
                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                  {(() => {
                    const totalLeads = [...acqLeadCounts.values()].reduce((s, v) => s + v, 0)
                    return totalLeads > 0 ? <span style={{ fontSize: 13, fontWeight: 600, color: C.yellow }}>${fmt$(totalAcqSpend / totalLeads)}</span> : '—'
                  })()}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── DISPO Lead Costs ──────────────────────────────────────────────── */}
      {tab === 'dispo' && (
        <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>DISPO Lead Source Costs</span>
              <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>Monthly ad spend per disposition channel · {month} {year}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ecdc4' }}>Total: ${fmt$(totalDispoSpend)}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${bd}` }}>
                {['Lead Source', 'Monthly Spend', 'Leads This Month', 'Cost Per Lead', 'Share of Spend', ''].map(h => (
                  <th key={h} style={{ padding: '10px 24px', textAlign: h === 'Lead Source' ? 'left' : h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(dispoCosts).map(([src, amt], i, arr) => {
                const leads = dispoLeadCounts.get(src) ?? 0
                const cpl   = leads > 0 ? amt / leads : null
                const pct   = totalDispoSpend > 0 ? (amt / totalDispoSpend) * 100 : 0
                return (
                  <tr key={src} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${bd}` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: '#4ecdc4', opacity: 0.7 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{src}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <DollarInput value={amt} onChange={v => setDispoCosts(p => ({ ...p, [src]: v }))} />
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{leads}</td>
                    <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: cpl != null ? C.yellow : C.dimText }}>
                      {cpl != null ? `$${fmt$(cpl)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #4ecdc4, #4ecdc488)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#4ecdc4', fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 24px' }}>
                      <span style={{ fontSize: 10, color: C.dimText, fontStyle: 'italic' }}>editable</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `1px solid ${bd}`, background: 'rgba(78,205,196,0.04)' }}>
                <td style={{ padding: '12px 24px', fontSize: 13, fontWeight: 700, color: C.text }}>Total</td>
                <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#4ecdc4' }}>${fmt$(totalDispoSpend)}</td>
                <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, color: C.mutedText }}>{[...dispoLeadCounts.values()].reduce((s, v) => s + v, 0)}</td>
                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                  {(() => {
                    const totalLeads = [...dispoLeadCounts.values()].reduce((s, v) => s + v, 0)
                    return totalLeads > 0 ? <span style={{ fontSize: 13, fontWeight: 600, color: C.yellow }}>${fmt$(totalDispoSpend / totalLeads)}</span> : '—'
                  })()}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Business Expenses ─────────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Business Expenses</span>
                <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>Non-lead operating costs · {month} {year}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>Total: ${fmt$(totalExpenses)}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${bd}` }}>
                  {['Category', 'Monthly Amount', '% of Expenses', 'Bar', ''].map(h => (
                    <th key={h} style={{ padding: '10px 24px', textAlign: h === 'Category' ? 'left' : h === 'Bar' || h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h !== 'Bar' ? h : ''}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, i) => {
                  const pct = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0
                  return (
                    <tr key={exp.category} style={{ borderBottom: i < expenses.length - 1 ? `1px solid ${bd}` : undefined }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: C.yellow, opacity: 0.7 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{exp.category}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                        <DollarInput
                          value={exp.amount}
                          onChange={v => setExpenses(prev => prev.map((e, j) => j === i ? { ...e, amount: v } : e))}
                        />
                      </td>
                      <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 13, color: C.dimText }}>{pct.toFixed(1)}%</td>
                      <td style={{ padding: '12px 24px', minWidth: 160 }}>
                        <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${C.yellow}bb, ${C.yellow}55)`, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 24px' }}>
                        <span style={{ fontSize: 10, color: C.dimText, fontStyle: 'italic' }}>editable</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `1px solid ${bd}`, background: 'rgba(252,175,23,0.04)' }}>
                  <td style={{ padding: '12px 24px', fontSize: 13, fontWeight: 700, color: C.text }}>Total</td>
                  <td style={{ padding: '12px 24px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: C.yellow }}>${fmt$(totalExpenses)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Info card */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'rgba(48,125,192,0.06)', border: `1px solid ${C.blue}25`, borderRadius: 12 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="9" cy="9" r="8" stroke={C.blue} strokeWidth="1.2" />
              <path d="M9 8v5" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="9" cy="5.5" r="0.8" fill={C.blue} />
            </svg>
            <div style={{ fontSize: 12, color: C.dimText, lineHeight: 1.6 }}>
              <strong style={{ color: C.blue }}>In Milestone 2</strong> — these categories will be editable by admin/accountant from this screen and saved per-month to Supabase. The CEO Dashboard will pull live values automatically. You can also add custom expense categories.
            </div>
          </div>
        </div>
      )}

      {/* ── Deal Profits ──────────────────────────────────────────────────── */}
      {tab === 'deals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: C.card, border: `1px solid ${bd}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>Closed Deal Profits</span>
                <span style={{ fontSize: 11, color: C.dimText, marginLeft: 10 }}>Edit profit per deal — synced from GHL potential_profit field, overridable here</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Total: ${fmt$(totalDealProfit)}</div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 480 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: C.card, zIndex: 1 }}>
                  <tr style={{ borderBottom: `1px solid ${bd}` }}>
                    {['Contact', 'Lead Source', 'Exit Strategy', 'Type', 'Closed', 'Profit', ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: h === 'Contact' ? 'left' : h === '' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closedDeals.map((deal, i) => {
                    const es = DUMMY_EXIT_STRATEGIES.get(deal.contact_id) ?? '—'
                    const ES_COLORS: Record<string, string> = {
                      'Wholesale': C.blue, 'Fix & Flip': C.yellow, 'Seller Finance': C.green,
                      'Subject To': '#9b59b6', 'Novation': '#e67e22',
                    }
                    const esColor = ES_COLORS[es] ?? C.dimText
                    const closedDate = new Date(deal.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <tr key={deal.id} style={{ borderBottom: i < closedDeals.length - 1 ? `1px solid ${bd}` : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.green}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: C.green, flexShrink: 0 }}>
                              {deal.contact_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{deal.contact_name}</div>
                              <div style={{ fontSize: 10, color: C.dimText }}>{deal.user_name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 12, color: C.mutedText }}>{deal.lead_source}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: `${esColor}15`, color: esColor, border: `1px solid ${esColor}30` }}>{es}</span>
                        </td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, color: C.dimText }}>{deal.kpi_type}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 11, color: C.dimText }}>{closedDate}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                          <DollarInput
                            value={dealProfits[deal.id] ?? 0}
                            onChange={v => setDealProfits(p => ({ ...p, [deal.id]: v }))}
                          />
                        </td>
                        <td style={{ padding: '10px 20px' }}>
                          <span style={{ fontSize: 10, color: C.dimText, fontStyle: 'italic' }}>editable</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `1px solid ${bd}`, background: 'rgba(67,183,73,0.04)' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: C.text }}>Total ({closedDeals.length} deals)</td>
                    <td colSpan={4} />
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: C.green }}>${fmt$(totalDealProfit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Info card */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'rgba(67,183,73,0.06)', border: `1px solid ${C.green}25`, borderRadius: 12 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="9" cy="9" r="8" stroke={C.green} strokeWidth="1.2" />
              <path d="M9 8v5" stroke={C.green} strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="9" cy="5.5" r="0.8" fill={C.green} />
            </svg>
            <div style={{ fontSize: 12, color: C.dimText, lineHeight: 1.6 }}>
              <strong style={{ color: C.green }}>How profits flow</strong> — reps should enter the deal profit on the GHL contact before moving it to Closed Deal. That value comes in via webhook as <code style={{ color: C.blue, fontSize: 11 }}>potential_profit</code>. If missing or incorrect, the accountant corrects it here. In Milestone 2, edits save to <code style={{ color: C.blue, fontSize: 11 }}>live_calls.potential_profit</code> and immediately update the CEO Dashboard.
            </div>
          </div>
        </div>
      )}

      <SaveToast show={toast} onHide={() => setToast(false)} />
    </div>
  )
}
