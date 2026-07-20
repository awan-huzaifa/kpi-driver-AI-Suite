'use client'

import React, { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { C } from '@/components/platform/brand'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'

interface CostBreakdown {
  property_api_1?: number
  property_api_2?: number
  transcription?:  number
  voice_agent?:    number
  ai?: number
}

export interface UsageLogRow {
  id:              string
  app:             'underwriting' | 'sales_coach' | 'training_coach' | 'note_taker' | 'data_enrichment'
  entity_id:       string
  entity_type:     'deal' | 'live_call' | 'training_call' | 'note_taker_call' | 'data_enrichment_log'
  input_tokens:    number
  output_tokens:   number
  cost_usd:        number
  model:           string
  created_at:      string
  cost_breakdown?: CostBreakdown | null
}

const COLUMNS = ['Date', 'App', 'Flow', 'Input Tokens', 'Output Tokens', 'Cost', '']

const APP_LABELS: Record<UsageLogRow['app'], string> = {
  underwriting:    'AI Deal Underwriter',
  sales_coach:     'AI Sales Coach',
  training_coach:  'AI Training Coach',
  note_taker:      'AI Note Taker',
  data_enrichment: 'AI Data Enrichment',
}

const BREAKDOWN_LABELS: Record<keyof CostBreakdown, string> = {
  property_api_1: 'Property API 1',
  property_api_2: 'Property API 2',
  ai:             'AI Analysis',
  transcription:  'Transcription',
  voice_agent:    'AI Voice',
}

const ENTITY_LABELS: Record<UsageLogRow['entity_type'], string> = {
  deal:                'Deal Underwriting',
  live_call:           'Live Call Score',
  training_call:       'Training Call Score',
  note_taker_call:     'Note Taker Call',
  data_enrichment_log: 'Data Enrichment',
}

function entityLink(row: UsageLogRow): string {
  if (row.entity_type === 'deal')             return `/underwriting/deals/${row.entity_id}`
  if (row.entity_type === 'live_call')        return `/sales-coach/live-calls?callId=${row.entity_id}`
  if (row.entity_type === 'training_call')    return `/training-coach?callId=${row.entity_id}`
  if (row.entity_type === 'note_taker_call')     return `/note-taker?callId=${row.entity_id}`
  if (row.entity_type === 'data_enrichment_log') return `/data-enrichment?logId=${row.entity_id}`
  return '#'
}

const PERIODS = [
  { value: 'today',     label: 'Today' },
  { value: 'week',      label: 'Last 7 Days' },
  { value: 'month',     label: 'Last 30 Days' },
  { value: 'sixMonths', label: 'Last 6 Months' },
  { value: 'year',      label: 'Last Year' },
  { value: 'all',       label: 'All Time' },
  { value: 'custom',    label: 'Custom Range' },
] as const

type Period = typeof PERIODS[number]['value']

const APP_FILTER_OPTIONS = [
  { value: 'all',            label: 'All Apps' },
  { value: 'underwriting',   label: 'AI Deal Underwriter' },
  { value: 'sales_coach',    label: 'AI Sales Coach' },
  { value: 'training_coach', label: 'AI Training Coach' },
  { value: 'note_taker',      label: 'AI Note Taker' },
  { value: 'data_enrichment', label: 'AI Data Enrichment' },
] as const

type AppFilter = 'all' | UsageLogRow['app']

function periodStart(period: Exclude<Period, 'custom'>): Date {
  const now = new Date()
  const d = new Date(now)
  switch (period) {
    case 'today':     d.setHours(0, 0, 0, 0); return d
    case 'week':      d.setDate(now.getDate() - 7);    return d
    case 'month':     d.setMonth(now.getMonth() - 1);  return d
    case 'sixMonths': d.setMonth(now.getMonth() - 6);  return d
    case 'year':      d.setFullYear(now.getFullYear() - 1); return d
    case 'all':       return new Date(0)
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtCost(n: number) {
  return '$' + n.toFixed(4)
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} · ${time}`
}

const DATE_INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: C.text,
  colorScheme: 'dark',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 6px' }}>
      {children}
    </p>
  )
}

const PAGE_SIZE = 25

export default function UsageTab({ rows = [] }: { rows?: UsageLogRow[] }) {
  const [period, setPeriod]           = useState<Period>('month')
  const [appFilter, setAppFilter]     = useState<AppFilter>('all')
  const [customFrom, setCustomFrom]   = useState<string>(todayStr())
  const [customTo,   setCustomTo]     = useState<string>(todayStr())
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [page, setPage]               = useState(1)

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const date = new Date(r.created_at)
      if (period === 'custom') {
        const from = new Date(customFrom + 'T00:00:00')
        const to   = new Date(customTo   + 'T23:59:59')
        if (date < from || date > to) return false
      } else {
        if (date < periodStart(period)) return false
      }
      if (appFilter !== 'all' && r.app !== appFilter) return false
      return true
    })
  }, [rows, period, appFilter, customFrom, customTo])

  // Reset to page 1 whenever filters change
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pageRows    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const totalCost   = filtered.reduce((sum, r) => sum + r.cost_usd, 0)
  const totalInput  = filtered.reduce((sum, r) => sum + r.input_tokens, 0)
  const totalOutput = filtered.reduce((sum, r) => sum + r.output_tokens, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Cost', value: fmtCost(totalCost), color: C.green },
          { label: 'Workflow Runs', value: filtered.length.toLocaleString(), color: C.white },
          { label: 'Tokens (In / Out)', value: `${totalInput.toLocaleString()} / ${totalOutput.toLocaleString()}`, color: C.white },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '16px 20px',
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 8px' }}>
              {label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
      }}>
        {/* App filter */}
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <FilterLabel>App</FilterLabel>
          <Select value={appFilter} onValueChange={(v) => { setAppFilter(v as AppFilter); setPage(1) }}>
            <SelectTrigger className="w-full" />
            <SelectContent>
              {APP_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: C.border, alignSelf: 'flex-end', marginBottom: 1 }} />

        {/* Period filter */}
        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <FilterLabel>Period</FilterLabel>
          <Select value={period} onValueChange={(v) => { setPeriod(v as Period); setPage(1) }}>
            <SelectTrigger className="w-full" />
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date range — slides in when Custom Range is selected */}
        {period === 'custom' && (
          <>
            <div style={{ width: 1, height: 36, background: C.border, alignSelf: 'flex-end', marginBottom: 1 }} />
            <div style={{ flex: '1 1 130px', minWidth: 120 }}>
              <FilterLabel>From</FilterLabel>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1) }}
                style={DATE_INPUT_STYLE}
              />
            </div>
            <div style={{ flex: '1 1 130px', minWidth: 120 }}>
              <FilterLabel>To</FilterLabel>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1) }}
                style={DATE_INPUT_STYLE}
              />
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Workflow Usage</p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: '2px 0 0' }}>
              Token Usage And Cost Per Workflow Run, Across Every App.
            </p>
          </div>
          {filtered.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText }}>
              {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, marginBottom: 16,
              background: 'rgba(67,183,73,0.10)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BarChart3 size={22} style={{ color: C.green }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
              {rows.length === 0 ? 'No Usage Recorded Yet' : 'No Usage In This Period'}
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.dimText, margin: 0, maxWidth: 320, lineHeight: 1.6 }}>
              {rows.length === 0
                ? 'Every AI Workflow Run Will Appear Here With Token Counts And Cost.'
                : 'Try A Wider Date Range Or A Different App Filter To See More Activity.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {COLUMNS.map((h, i) => (
                  <th key={h || `col-${i}`} style={{
                    textAlign: 'center',
                    padding: i === 0 ? '10px 22px' : i === COLUMNS.length - 1 ? '10px 22px' : '10px 12px',
                    fontSize: 10, fontWeight: 800, color: C.text,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    width: i === COLUMNS.length - 1 ? 44 : undefined,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const hasBreakdown = !!r.cost_breakdown && Object.keys(r.cost_breakdown).length > 0
                const isExpanded   = expandedRows.has(r.id)
                const bdKeys       = hasBreakdown ? (Object.keys(r.cost_breakdown!) as (keyof CostBreakdown)[]) : []
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      onClick={() => hasBreakdown && toggleRow(r.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : `1px solid ${C.border}`,
                        cursor: hasBreakdown ? 'pointer' : 'default',
                      }}
                    >
                      <td style={{ padding: '12px 22px', fontSize: 13, color: C.bodyText, whiteSpace: 'nowrap', textAlign: 'center' }}>{fmtDate(r.created_at)}</td>
                      <td style={{ padding: '12px', fontSize: 13, fontWeight: 500, color: C.text, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {hasBreakdown && (
                            isExpanded
                              ? <ChevronDown size={13} style={{ color: C.dimText, flexShrink: 0 }} />
                              : <ChevronRight size={13} style={{ color: C.dimText, flexShrink: 0 }} />
                          )}
                          {APP_LABELS[r.app]}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: C.bodyText, textAlign: 'center' }}>{ENTITY_LABELS[r.entity_type]}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: C.bodyText, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r.input_tokens.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: C.bodyText, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r.output_tokens.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 13, fontWeight: 700, color: C.green, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{fmtCost(r.cost_usd)}</td>
                      <td style={{ padding: '12px 22px', textAlign: 'center' }}>
                        <Link
                          href={entityLink(r)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: C.dimText, display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                    {hasBreakdown && isExpanded && (
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)' }}>
                        <td colSpan={7} style={{ padding: '10px 22px 16px 46px' }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                            {bdKeys.map((key) => (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.dimText }}>
                                  {BREAKDOWN_LABELS[key] ?? key}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtCost(r.cost_breakdown![key] ?? 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Pagination footer */}
        {filtered.length > PAGE_SIZE && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 22px', borderTop: `1px solid ${C.border}`,
          }}>
            {/* Page number pills */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const isActive = p === safePage
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      minWidth: 32, height: 32, borderRadius: 8, border: 'none',
                      fontSize: 12, fontWeight: isActive ? 700 : 500,
                      cursor: isActive ? 'default' : 'pointer',
                      background: isActive ? C.blue : 'transparent',
                      color: isActive ? '#fff' : C.dimText,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                  fontSize: 12, fontWeight: 600,
                  background: 'transparent', cursor: safePage === 1 ? 'default' : 'pointer',
                  color: safePage === 1 ? C.dimText : C.text,
                  opacity: safePage === 1 ? 0.4 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (safePage !== 1) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
                  fontSize: 12, fontWeight: 600,
                  background: 'transparent', cursor: safePage === totalPages ? 'default' : 'pointer',
                  color: safePage === totalPages ? C.dimText : C.text,
                  opacity: safePage === totalPages ? 0.4 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (safePage !== totalPages) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
