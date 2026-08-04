'use client'

import React, { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight, ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'
import { C } from '@/components/platform/brand'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'
import { ExportModal, type ColDef } from '@/components/ui/export-modal'
import DateRangePicker, { periodBounds, type DatePeriod } from '@/components/ui/date-range-picker'

interface CostBreakdown {
  property_api_1?: number
  property_api_2?: number
  transcription?:  number
  voice_agent?:    number
  ai?: number
}

export interface UsageLogRow {
  id:              string
  app:             'underwriting' | 'sales_coach' | 'training_coach' | 'note_taker' | 'data_enrichment' | 'skip_tracing'
  entity_id:       string
  entity_type:     'deal' | 'live_call' | 'training_call' | 'note_taker_call' | 'data_enrichment_log' | 'skip_tracing_log'
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
  skip_tracing:    'AI Skiptracing',
}

const BREAKDOWN_LABELS: Record<keyof CostBreakdown, string> = {
  property_api_1: 'Property API 1',
  property_api_2: 'Property API 2',
  ai:             'AI Analysis',
  transcription:  'Transcription',
  voice_agent:    'AI Training Coach',
}

const ENTITY_LABELS: Record<UsageLogRow['entity_type'], string> = {
  deal:                'Deal Underwriting',
  live_call:           'Live Call Score',
  training_call:       'Training Call Score',
  note_taker_call:     'Note Taker Call',
  data_enrichment_log: 'Data Enrichment',
  skip_tracing_log:    'Skip Trace',
}

function entityLink(row: UsageLogRow): string {
  if (row.entity_type === 'deal')             return `/underwriting/deals/${row.entity_id}`
  if (row.entity_type === 'live_call')        return `/sales-coach/live-calls?callId=${row.entity_id}`
  if (row.entity_type === 'training_call')    return `/training-coach?callId=${row.entity_id}`
  if (row.entity_type === 'note_taker_call')     return `/note-taker?callId=${row.entity_id}`
  if (row.entity_type === 'data_enrichment_log') return `/data-enrichment?logId=${row.entity_id}`
  return '#'
}

const APP_FILTER_OPTIONS = [
  { value: 'all',            label: 'All Apps' },
  { value: 'underwriting',   label: 'AI Deal Underwriter' },
  { value: 'sales_coach',    label: 'AI Sales Coach' },
  { value: 'training_coach', label: 'AI Training Coach' },
  { value: 'note_taker',      label: 'AI Note Taker' },
  { value: 'data_enrichment', label: 'AI Data Enrichment' },
  { value: 'skip_tracing',    label: 'AI Skiptracing' },
] as const

type AppFilter = 'all' | UsageLogRow['app']

function fmtCost(n: number) {
  return '$' + n.toFixed(4)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 2)
  const end   = Math.min(total - 1, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 6px' }}>
      {children}
    </p>
  )
}

const PAGE_SIZE = 15

export default function UsageTab({ rows = [], dealAddresses = {}, dealRunNumbers = {} }: { rows?: UsageLogRow[]; dealAddresses?: Record<string, string>; dealRunNumbers?: Record<string, number> }) {
  const [period, setPeriod]           = useState<DatePeriod>('30d')
  const [appFilter, setAppFilter]     = useState<AppFilter>('all')
  const [customFrom, setCustomFrom]   = useState<string>('')
  const [customTo,   setCustomTo]     = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [page,        setPage]         = useState(1)
  const [exportOpen,  setExportOpen]   = useState(false)
  const [exportApps,  setExportApps]   = useState<string[]>([])

  const exportDefaultCols: ColDef<UsageLogRow>[] = [
    { label: 'Date',          getValue: r => fmtDate(r.created_at) },
    { label: 'Time',          getValue: r => fmtTime(r.created_at) },
    { label: 'App',           getValue: r => APP_LABELS[r.app] },
    { label: 'Flow',          getValue: r => ENTITY_LABELS[r.entity_type] },
    { label: 'Input Tokens',  getValue: r => r.input_tokens },
    { label: 'Output Tokens', getValue: r => r.output_tokens },
    { label: 'Cost ($)',      getValue: r => r.cost_usd },
  ]
  const exportExtraCols: ColDef<UsageLogRow>[] = [
    { label: 'Model',        getValue: r => r.model },
    { label: 'Property API 1', getValue: r => r.cost_breakdown?.property_api_1 ?? null },
    { label: 'Property API 2', getValue: r => r.cost_breakdown?.property_api_2 ?? null },
    { label: 'AI Analysis',    getValue: r => r.cost_breakdown?.ai ?? null },
    { label: 'Transcription',  getValue: r => r.cost_breakdown?.transcription ?? null },
    { label: 'AI Voice',       getValue: r => r.cost_breakdown?.voice_agent ?? null },
  ]

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const { from, to } = periodBounds(period, customFrom, customTo)
    return rows.filter((r) => {
      const date = new Date(r.created_at)
      if (from && date < from) return false
      if (to   && date > to)   return false
      if (appFilter !== 'all' && r.app !== appFilter) return false
      return true
    })
  }, [rows, period, appFilter, customFrom, customTo])

  // Reset to page 1 whenever filters change
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pageRows    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Filter bar */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        {/* App filter */}
        <div style={{ width: 200, flexShrink: 0 }}>
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
        <div style={{ width: 1, height: 36, background: C.border, marginTop: 22, flexShrink: 0 }} />

        {/* Period filter — expands downward when Custom is active */}
        <div style={{ flex: 1 }}>
          <FilterLabel>Period</FilterLabel>
          <DateRangePicker
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriod={(p) => { setPeriod(p); setPage(1) }}
            onCustomFrom={(v) => { setCustomFrom(v); setPage(1) }}
            onCustomTo={(v) => { setCustomTo(v); setPage(1) }}
          />
        </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setExportOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(48,125,192,0.1)', border: '1px solid rgba(48,125,192,0.25)',
                color: '#307DC0', fontSize: 12, fontWeight: 700,
              }}
            >
              <Download size={13} /> Export
            </button>
          </div>
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
                      <td style={{ padding: '12px 22px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', margin: 0 }}>{fmtDate(r.created_at)}</p>
                      <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0' }}>{fmtTime(r.created_at)}</p>
                    </td>
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
                      <td style={{ padding: '12px', fontSize: 13, color: C.bodyText, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r.entity_type === 'skip_tracing_log' ? <span style={{ color: C.dimText }}>—</span> : r.input_tokens.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 13, color: C.bodyText, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{r.entity_type === 'skip_tracing_log' ? <span style={{ color: C.dimText }}>—</span> : r.output_tokens.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 13, fontWeight: 700, color: C.green, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{fmtCost(r.cost_usd)}</td>
                      <td style={{ padding: '12px 22px', textAlign: 'center' }}>
                        {r.entity_type !== 'skip_tracing_log' && (
                          <Link
                            href={entityLink(r)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: C.dimText, display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
                            onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
                          >
                            <ExternalLink size={14} />
                          </Link>
                        )}
                      </td>
                    </tr>
                    {hasBreakdown && isExpanded && (
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)' }}>
                        <td colSpan={7} style={{ padding: '10px 22px 16px 46px' }}>
                          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
                            {r.entity_type === 'deal' && dealAddresses[r.entity_id] && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.dimText }}>
                                  Property
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                                  {dealAddresses[r.entity_id]}
                                </span>
                                {(() => {
                                  const idx = dealRunNumbers[r.id] ?? 0
                                  const label = idx === 0 ? 'Run 1' : `Re-run ${idx}`
                                  const color = idx === 0 ? C.dimText : '#FCAF17'
                                  return (
                                    <span style={{
                                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                      background: idx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(252,175,23,0.1)',
                                      color, border: `1px solid ${idx === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(252,175,23,0.25)'}`,
                                    }}>{label}</span>
                                  )
                                })()}
                              </div>
                            )}
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
            {/* Row count */}
            <span style={{ fontSize: 11, fontWeight: 600, color: C.dimText }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>

            {/* Page number pills */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {getPageWindow(safePage, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: C.dimText, padding: '0 2px', userSelect: 'none' }}>…</span>
                  : (() => {
                      const isActive = p === safePage
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          style={{
                            minWidth: 32, height: 32, borderRadius: 8, border: 'none',
                            fontSize: 12, fontWeight: isActive ? 700 : 500,
                            cursor: isActive ? 'default' : 'pointer',
                            background: isActive ? C.blue : 'rgba(255,255,255,0.04)',
                            color: isActive ? '#fff' : C.dimText,
                            transition: 'background 0.15s, color 0.15s',
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                        >
                          {p}
                        </button>
                      )
                    })()
              )}
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

      {exportOpen && (
        <ExportModal
          onClose={() => { setExportOpen(false); setExportApps([]) }}
          data={(exportApps.length === 0 ? rows : rows.filter(r => exportApps.includes(r.app))) as unknown as Record<string, unknown>[]}
          defaultCols={exportDefaultCols as unknown as ColDef<Record<string, unknown>>[]}
          extraCols={exportExtraCols as unknown as ColDef<Record<string, unknown>>[]}
          filenamePrefix="Billing-Usage"
          filterSlot={
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                App
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {APP_FILTER_OPTIONS.map(o => {
                  const isAll    = o.value === 'all'
                  const isActive = isAll ? exportApps.length === 0 : exportApps.includes(o.value)
                  function handleClick() {
                    if (isAll) { setExportApps([]); return }
                    setExportApps(prev =>
                      prev.includes(o.value)
                        ? prev.filter(v => v !== o.value)
                        : [...prev, o.value]
                    )
                  }
                  return (
                    <button
                      key={o.value}
                      onClick={handleClick}
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', border: 'none', transition: 'all 0.12s',
                        background: isActive ? 'rgba(48,125,192,0.15)' : 'rgba(255,255,255,0.04)',
                        color:      isActive ? '#307DC0' : '#64748b',
                        outline:    isActive ? '1px solid rgba(48,125,192,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          }
        />
      )}
    </div>
  )
}
