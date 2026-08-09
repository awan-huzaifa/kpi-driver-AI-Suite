'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save, CheckCircle2, RotateCcw, Globe, Building2 } from 'lucide-react'
import type { PlanId } from '@kpidriver/auth/types'
import PlatformShell, { type Access } from '@/components/platform/PlatformShell'
import { C } from '@/components/platform/brand'
import { updateBillingMultiplier, clearCompanyPricing, updateUnderwritingPricing, updateClaudeOnlyPricing, updateTrainingCoachPricing, updateSkipTracingPricing, updateNoteTakerPricing, updateDataEnrichmentPricing } from '@/app/actions/super-admin/billing-config'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'

interface ConfigRow {
  id:                          string
  app:                         string
  multiplier:                  number
  company_id:                  string | null
  updated_at:                  string
  rentcast_cost_usd:           number | null
  axesso_cost_usd:             number | null
  rentcast_charged_usd:        number | null
  axesso_charged_usd:          number | null
  claude_input_charged_per_m:  number | null
  claude_output_charged_per_m: number | null
  assistable_charged_per_min?: number | null
  credit_cost_usd?:            number | null
  st_charged_normal_usd?:      number | null
  st_charged_advanced_usd?:    number | null
  st_charged_apn_usd?:         number | null
  st_charged_dnc_usd?:         number | null
  nt_whisper_charged_per_min?: number | null
  nt_gpt_input_charged_per_m?: number | null
  nt_gpt_output_charged_per_m?:number | null
  de_charged_per_call_usd?:    number | null
}

interface Props {
  config:      ConfigRow[]
  companies:   { id: string; name: string }[]
  currentUser: { email: string; fullName: string | null }
  planId:      PlanId | null
  access:      Access
}

const APP_LABELS: Record<string, string> = {
  underwriting:   'AI Deal Underwriting',
  sales_coach:    'AI Sales Coach',
  training_coach: 'AI Training Coach',
  note_taker:     'AI Note Taker',
  data_enrichment:'AI Data Enrichment',
  skip_tracing:   'Skiptracing',
}

const APP_DESC: Record<string, string> = {
  underwriting:   'Per-API pricing applied to each deal underwriting pipeline run.',
  sales_coach:    'Per-token Claude Sonnet 4.6 pricing applied to each live call scored.',
  training_coach: 'Per-component pricing: Assistable voice AI ($/min) + Claude Sonnet 4.6 tokens.',
  note_taker:     'Per-component pricing: OpenAI Whisper transcription ($/min) + GPT tokens.',
  data_enrichment:'Per-call Axesso pricing applied to each data enrichment lookup.',
  skip_tracing:   'Per-credit Tracerfy pricing. All flow types use credits_deducted × charged rate.',
}

// Apps that use the new per-component pricing model (no multiplier)
const PER_API_APPS = new Set(['underwriting', 'sales_coach', 'training_coach', 'skip_tracing', 'note_taker', 'data_enrichment'])

const ALL_APPS = ['underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment', 'skip_tracing']

// Claude Opus rate card — Underwriting (Anthropic pricing — reference only)
const CLAUDE_INPUT_RATE  = 5.00   // $/1M input tokens
const CLAUDE_OUTPUT_RATE = 25.00  // $/1M output tokens

// Claude Sonnet 4.6 rate card — Sales Coach (Anthropic pricing — reference only)
const SC_CLAUDE_INPUT_RATE  = 3.00   // $/1M input tokens
const SC_CLAUDE_OUTPUT_RATE = 15.00  // $/1M output tokens

export default function BillingConfigClient({ config, companies, currentUser, planId, access }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<string>('global')

  function getPricingRow(app: string, cid: string | null) {
    return (cid ? config.find(r => r.company_id === cid && r.app === app) : null)
        ?? config.find(r => r.company_id === null && r.app === app)
  }

  const getInitialValues = (companyId: string | null) =>
    Object.fromEntries(
      ALL_APPS.filter(app => !PER_API_APPS.has(app)).map((app) => {
        const override = companyId ? config.find(r => r.company_id === companyId && r.app === app) : null
        const global_  = config.find(r => r.company_id === null && r.app === app)
        return [app, String(override?.multiplier ?? global_?.multiplier ?? '3.0')]
      })
    )

  const globalUwRow = config.find(r => r.company_id === null && r.app === 'underwriting')
  const globalScRow = config.find(r => r.company_id === null && r.app === 'sales_coach')
  const globalTcRow = config.find(r => r.company_id === null && r.app === 'training_coach')
  const globalStRow = config.find(r => r.company_id === null && r.app === 'skip_tracing')
  const globalNtRow = config.find(r => r.company_id === null && r.app === 'note_taker')
  const globalDeRow = config.find(r => r.company_id === null && r.app === 'data_enrichment')

  const [values,    setValues]    = useState<Record<string, string>>(getInitialValues(null))
  const [saving,    setSaving]    = useState<string | null>(null)
  const [saved,     setSaved]     = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  // Underwriting per-API charged price state
  const [rentcastCharged,    setRentcastCharged]    = useState(String(globalUwRow?.rentcast_charged_usd        ?? 0.074))
  const [axessoCharged,      setAxessoCharged]      = useState(String(globalUwRow?.axesso_charged_usd           ?? 0.020))
  const [claudeInputCharged, setClaudeInputCharged] = useState(String(globalUwRow?.claude_input_charged_per_m  ?? CLAUDE_INPUT_RATE))
  const [claudeOutputCharged,setClaudeOutputCharged]= useState(String(globalUwRow?.claude_output_charged_per_m ?? CLAUDE_OUTPUT_RATE))
  const [savingUw,   setSavingUw]   = useState(false)
  const [savedUw,    setSavedUw]    = useState(false)
  const [uwError,    setUwError]    = useState('')

  // Sales Coach per-token charged price state
  const [scInputCharged,  setScInputCharged]  = useState(String(globalScRow?.claude_input_charged_per_m  ?? SC_CLAUDE_INPUT_RATE))
  const [scOutputCharged, setScOutputCharged] = useState(String(globalScRow?.claude_output_charged_per_m ?? SC_CLAUDE_OUTPUT_RATE))
  const [savingSc,  setSavingSc]  = useState(false)
  const [savedSc,   setSavedSc]   = useState(false)
  const [scError,   setScError]   = useState('')

  // Training Coach per-component charged price state
  const [tcAssistableCharged, setTcAssistableCharged] = useState(String(globalTcRow?.assistable_charged_per_min ?? 0.15))
  const [tcInputCharged,      setTcInputCharged]      = useState(String(globalTcRow?.claude_input_charged_per_m  ?? SC_CLAUDE_INPUT_RATE))
  const [tcOutputCharged,     setTcOutputCharged]     = useState(String(globalTcRow?.claude_output_charged_per_m ?? SC_CLAUDE_OUTPUT_RATE))
  const [savingTc,  setSavingTc]  = useState(false)
  const [savedTc,   setSavedTc]   = useState(false)
  const [tcError,   setTcError]   = useState('')

  // Skip Tracing per-flow-type charged price state
  const [stNormalCharged,   setStNormalCharged]   = useState(String(globalStRow?.st_charged_normal_usd   ?? 0.02))
  const [stAdvancedCharged, setStAdvancedCharged] = useState(String(globalStRow?.st_charged_advanced_usd ?? 0.04))
  const [stApnCharged,      setStApnCharged]      = useState(String(globalStRow?.st_charged_apn_usd      ?? 0.10))
  const [stDncCharged,      setStDncCharged]      = useState(String(globalStRow?.st_charged_dnc_usd      ?? 0.02))
  const [savingSt,  setSavingSt]  = useState(false)
  const [savedSt,   setSavedSt]   = useState(false)
  const [stError,   setStError]   = useState('')

  // Note Taker per-component charged price state
  const [ntWhisperCharged,    setNtWhisperCharged]    = useState(String(globalNtRow?.nt_whisper_charged_per_min  ?? 0.006))
  const [ntGptInputCharged,   setNtGptInputCharged]   = useState(String(globalNtRow?.nt_gpt_input_charged_per_m  ?? 0.75))
  const [ntGptOutputCharged,  setNtGptOutputCharged]  = useState(String(globalNtRow?.nt_gpt_output_charged_per_m ?? 4.50))
  const [savingNt,  setSavingNt]  = useState(false)
  const [savedNt,   setSavedNt]   = useState(false)
  const [ntError,   setNtError]   = useState('')

  // Data Enrichment per-call charged price state
  const [deCallCharged, setDeCallCharged] = useState(String(globalDeRow?.de_charged_per_call_usd ?? 0.0016))
  const [savingDe, setSavingDe] = useState(false)
  const [savedDe,  setSavedDe]  = useState(false)
  const [deError,  setDeError]  = useState('')

  function handleSaveUnderwritingPricing() {
    const rc = parseFloat(rentcastCharged)
    const ax = parseFloat(axessoCharged)
    const ci = parseFloat(claudeInputCharged)
    const co = parseFloat(claudeOutputCharged)
    if ([rc, ax, ci, co].some(v => isNaN(v) || v < 0)) {
      setUwError('All prices must be non-negative numbers')
      return
    }
    setUwError('')
    setSavingUw(true)
    startTransition(async () => {
      try {
        await updateUnderwritingPricing(rc, ax, ci, co, companyId)
        setSavedUw(true)
        setTimeout(() => setSavedUw(false), 3000)
      } catch (e) {
        setUwError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingUw(false)
      }
    })
  }

  function handleSaveSalesCoachPricing() {
    const ci = parseFloat(scInputCharged)
    const co = parseFloat(scOutputCharged)
    if ([ci, co].some(v => isNaN(v) || v < 0)) {
      setScError('All prices must be non-negative numbers')
      return
    }
    setScError('')
    setSavingSc(true)
    startTransition(async () => {
      try {
        await updateClaudeOnlyPricing('sales_coach', ci, co, companyId)
        setSavedSc(true)
        setTimeout(() => setSavedSc(false), 3000)
      } catch (e) {
        setScError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingSc(false)
      }
    })
  }

  function handleSaveTrainingCoachPricing() {
    const as = parseFloat(tcAssistableCharged)
    const ci = parseFloat(tcInputCharged)
    const co = parseFloat(tcOutputCharged)
    if ([as, ci, co].some(v => isNaN(v) || v < 0)) {
      setTcError('All prices must be non-negative numbers')
      return
    }
    setTcError('')
    setSavingTc(true)
    startTransition(async () => {
      try {
        await updateTrainingCoachPricing(as, ci, co, companyId)
        setSavedTc(true)
        setTimeout(() => setSavedTc(false), 3000)
      } catch (e) {
        setTcError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingTc(false)
      }
    })
  }

  function handleSaveSkipTracingPricing() {
    const n = parseFloat(stNormalCharged)
    const a = parseFloat(stAdvancedCharged)
    const p = parseFloat(stApnCharged)
    const d = parseFloat(stDncCharged)
    if ([n, a, p, d].some(v => isNaN(v) || v < 0)) {
      setStError('All prices must be non-negative numbers')
      return
    }
    setStError('')
    setSavingSt(true)
    startTransition(async () => {
      try {
        await updateSkipTracingPricing(n, a, p, d, companyId)
        setSavedSt(true)
        setTimeout(() => setSavedSt(false), 3000)
      } catch (e) {
        setStError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingSt(false)
      }
    })
  }

  function handleSaveNoteTakerPricing() {
    const w  = parseFloat(ntWhisperCharged)
    const gi = parseFloat(ntGptInputCharged)
    const go = parseFloat(ntGptOutputCharged)
    if ([w, gi, go].some(v => isNaN(v) || v < 0)) {
      setNtError('All prices must be non-negative numbers')
      return
    }
    setNtError('')
    setSavingNt(true)
    startTransition(async () => {
      try {
        await updateNoteTakerPricing(w, gi, go, companyId)
        setSavedNt(true)
        setTimeout(() => setSavedNt(false), 3000)
      } catch (e) {
        setNtError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingNt(false)
      }
    })
  }

  function handleSaveDataEnrichmentPricing() {
    const c = parseFloat(deCallCharged)
    if (isNaN(c) || c < 0) {
      setDeError('Price must be a non-negative number')
      return
    }
    setDeError('')
    setSavingDe(true)
    startTransition(async () => {
      try {
        await updateDataEnrichmentPricing(c, companyId)
        setSavedDe(true)
        setTimeout(() => setSavedDe(false), 3000)
      } catch (e) {
        setDeError(e instanceof Error ? e.message : 'Failed to save')
      } finally {
        setSavingDe(false)
      }
    })
  }

  function handleCompanyChange(cid: string) {
    const resolvedCid = cid === 'global' ? null : cid
    setSelectedCompany(cid)
    setErrors({})
    setSaved(null)
    setValues(getInitialValues(resolvedCid))

    const uwRow = getPricingRow('underwriting',   resolvedCid)
    setRentcastCharged(String(uwRow?.rentcast_charged_usd        ?? 0.074))
    setAxessoCharged(String(uwRow?.axesso_charged_usd            ?? 0.020))
    setClaudeInputCharged(String(uwRow?.claude_input_charged_per_m  ?? CLAUDE_INPUT_RATE))
    setClaudeOutputCharged(String(uwRow?.claude_output_charged_per_m ?? CLAUDE_OUTPUT_RATE))

    const scRow = getPricingRow('sales_coach',    resolvedCid)
    setScInputCharged(String(scRow?.claude_input_charged_per_m  ?? SC_CLAUDE_INPUT_RATE))
    setScOutputCharged(String(scRow?.claude_output_charged_per_m ?? SC_CLAUDE_OUTPUT_RATE))

    const tcRow = getPricingRow('training_coach', resolvedCid)
    setTcAssistableCharged(String(tcRow?.assistable_charged_per_min  ?? 0.15))
    setTcInputCharged(String(tcRow?.claude_input_charged_per_m  ?? SC_CLAUDE_INPUT_RATE))
    setTcOutputCharged(String(tcRow?.claude_output_charged_per_m ?? SC_CLAUDE_OUTPUT_RATE))

    const stRow = getPricingRow('skip_tracing',   resolvedCid)
    setStNormalCharged(String(stRow?.st_charged_normal_usd   ?? 0.02))
    setStAdvancedCharged(String(stRow?.st_charged_advanced_usd ?? 0.04))
    setStApnCharged(String(stRow?.st_charged_apn_usd      ?? 0.10))
    setStDncCharged(String(stRow?.st_charged_dnc_usd      ?? 0.02))

    const ntRow = getPricingRow('note_taker',     resolvedCid)
    setNtWhisperCharged(String(ntRow?.nt_whisper_charged_per_min  ?? 0.006))
    setNtGptInputCharged(String(ntRow?.nt_gpt_input_charged_per_m  ?? 0.75))
    setNtGptOutputCharged(String(ntRow?.nt_gpt_output_charged_per_m ?? 4.50))

    const deRow = getPricingRow('data_enrichment', resolvedCid)
    setDeCallCharged(String(deRow?.de_charged_per_call_usd ?? 0.0016))
  }

  const companyId = selectedCompany === 'global' ? null : selectedCompany

  function hasOverride(app: string) {
    return companyId != null && config.some(r => r.company_id === companyId && r.app === app)
  }

  function globalMultiplier(app: string) {
    return config.find(r => r.company_id === null && r.app === app)?.multiplier ?? 1.3
  }

  function handleSave(app: string) {
    const val = parseFloat(values[app] ?? '')
    if (isNaN(val) || val < 1) {
      setErrors(e => ({ ...e, [app]: 'Must Be ≥ 1 (1 = No Markup, 1.3 = 30% Markup)' }))
      return
    }
    setErrors(e => ({ ...e, [app]: '' }))
    setSaving(app)
    startTransition(async () => {
      try {
        await updateBillingMultiplier(app, val, companyId)
        setSaved(app)
        setTimeout(() => setSaved(null), 3000)
      } catch (e) {
        setErrors(prev => ({ ...prev, [app]: e instanceof Error ? e.message : 'Failed To Save' }))
      } finally {
        setSaving(null)
      }
    })
  }

  function handleReset(app: string) {
    if (!companyId) return
    setResetting(app)
    startTransition(async () => {
      try {
        await clearCompanyPricing(app, companyId)
        // Reset states to global fallback values
        if (!PER_API_APPS.has(app)) {
          setValues(v => ({ ...v, [app]: String(globalMultiplier(app)) }))
        } else {
          // Re-derive per-component states from global row
          handleCompanyChange('global')
          // Then re-select the current company so the company selector stays correct
          setSelectedCompany(companyId)
          setValues(getInitialValues(companyId))
        }
      } catch (e) {
        setErrors(prev => ({ ...prev, [app]: e instanceof Error ? e.message : 'Failed To Reset' }))
      } finally {
        setResetting(null)
      }
    })
  }

  const markupPct = (app: string) => {
    const n = parseFloat(values[app] ?? '1')
    return isNaN(n) ? '—' : `+${Math.round((n - 1) * 100)}%`
  }

  const inputStyle = {
    width: 110, padding: '8px 12px', borderRadius: 9,
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
    color: C.white, fontSize: 14, fontWeight: 700, textAlign: 'center' as const,
    outline: 'none', fontVariantNumeric: 'tabular-nums' as const,
  }

  const refBadgeStyle = {
    display: 'inline-block', padding: '3px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
    fontSize: 12, fontWeight: 600, color: C.dimText, fontVariantNumeric: 'tabular-nums' as const,
  }

  return (
    <PlatformShell planId={planId} pageTitle="Billing Config">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Billing Config
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          All apps now use per-component charged prices set directly by the super admin — no multipliers.
        </p>
      </div>

      {/* Company selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {selectedCompany === 'global'
            ? <Globe size={15} style={{ color: '#78ABD6' }} />
            : <Building2 size={15} style={{ color: '#78ABD6' }} />
          }
          <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>
            {selectedCompany === 'global' ? 'Global Defaults' : companies.find(c => c.id === selectedCompany)?.name}
          </span>
          {selectedCompany !== 'global' && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#307DC0',
              background: 'rgba(48,125,192,0.12)', border: '1px solid rgba(48,125,192,0.25)',
              borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Company Override
            </span>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Select value={selectedCompany} onValueChange={handleCompanyChange}>
            <SelectTrigger placeholder="Select Company" className="w-auto min-w-[200px] text-sm" />
            <SelectContent>
              <SelectItem value="global">Global Defaults</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ALL_APPS.map((app) => {
          const isUw = app === 'underwriting'

          if (isUw) {
            // ── Underwriting: per-API pricing table ──────────────────────────
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                        {APP_LABELS[app]}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Per-API Pricing
                      </span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('underwriting') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('underwriting') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('underwriting') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('underwriting') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                    {/* Column headers */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 160px 160px',
                      gap: 12, marginBottom: 10, paddingBottom: 8,
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>API</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                    </div>

                    {/* RentCast row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>RentCast</p>
                        <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Per API call</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>${Number(globalUwRow?.rentcast_cost_usd ?? 0.074).toFixed(4)}/call</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                          <input
                            type="number" step="0.001" min="0"
                            value={rentcastCharged}
                            onChange={e => setRentcastCharged(e.target.value)}
                            style={inputStyle}
                          />
                          <span style={{ fontSize: 11, color: C.dimText }}>/ call</span>
                        </div>
                      </div>
                    </div>

                    {/* Axesso row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Axesso</p>
                        <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Per API call</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>${Number(globalUwRow?.axesso_cost_usd ?? 0.020).toFixed(4)}/call</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                          <input
                            type="number" step="0.001" min="0"
                            value={axessoCharged}
                            onChange={e => setAxessoCharged(e.target.value)}
                            style={inputStyle}
                          />
                          <span style={{ fontSize: 11, color: C.dimText }}>/ call</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider before Claude */}
                    <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0 12px' }} />

                    {/* Claude input row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Input Tokens</p>
                        <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Opus · per 1M input tokens</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>${CLAUDE_INPUT_RATE.toFixed(2)}/1M tokens</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                          <input
                            type="number" step="0.5" min="0"
                            value={claudeInputCharged}
                            onChange={e => setClaudeInputCharged(e.target.value)}
                            style={inputStyle}
                          />
                          <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                        </div>
                      </div>
                    </div>

                    {/* Claude output row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Output Tokens</p>
                        <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Opus · per 1M output tokens</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>${CLAUDE_OUTPUT_RATE.toFixed(2)}/1M tokens</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                          <input
                            type="number" step="1" min="0"
                            value={claudeOutputCharged}
                            onChange={e => setClaudeOutputCharged(e.target.value)}
                            style={inputStyle}
                          />
                          <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: save + reset */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {uwError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{uwError}</p>}
                        {companyId && hasOverride('underwriting') && (
                          <button onClick={() => handleReset('underwriting')} disabled={resetting === 'underwriting'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {resetting === 'underwriting' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                          </button>
                        )}
                      </div>
                      <button onClick={handleSaveUnderwritingPricing} disabled={savingUw} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {savingUw ? <Loader2 size={13} className="animate-spin" /> : savedUw ? <CheckCircle2 size={13} /> : <Save size={13} />}
                        {savedUw ? 'Saved' : 'Save Pricing'}
                      </button>
                    </div>
                  </>
              </div>
            )
          }

          // ── Sales Coach: Claude-only per-token pricing ───────────────────
          if (app === 'sales_coach') {
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                        {APP_LABELS[app]}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Per-Token Pricing
                      </span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('sales_coach') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('sales_coach') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('sales_coach') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('sales_coach') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Model</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                  </div>

                  {/* Claude Input row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Input Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Sonnet 4.6 · per 1M input tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>${SC_CLAUDE_INPUT_RATE.toFixed(2)}/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.5" min="0" value={scInputCharged} onChange={e => setScInputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Claude Output row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Output Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Sonnet 4.6 · per 1M output tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>${SC_CLAUDE_OUTPUT_RATE.toFixed(2)}/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="1" min="0" value={scOutputCharged} onChange={e => setScOutputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: save + reset */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {scError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{scError}</p>}
                      {companyId && hasOverride('sales_coach') && (
                        <button onClick={() => handleReset('sales_coach')} disabled={resetting === 'sales_coach'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {resetting === 'sales_coach' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                        </button>
                      )}
                    </div>
                    <button onClick={handleSaveSalesCoachPricing} disabled={savingSc} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {savingSc ? <Loader2 size={13} className="animate-spin" /> : savedSc ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {savedSc ? 'Saved' : 'Save Pricing'}
                    </button>
                  </div>
                </>
              </div>
            )
          }

          // ── Training Coach: Assistable + Claude per-component pricing ────
          if (app === 'training_coach') {
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                        {APP_LABELS[app]}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Per-Component Pricing
                      </span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('training_coach') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('training_coach') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('training_coach') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('training_coach') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Component</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                  </div>

                  {/* Assistable row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Assistable AI</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Per API call</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>$0.1500/min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.01" min="0" value={tcAssistableCharged} onChange={e => setTcAssistableCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ min</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0 12px' }} />

                  {/* Claude Input row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Input Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Sonnet 4.6 · per 1M input tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>${SC_CLAUDE_INPUT_RATE.toFixed(2)}/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.5" min="0" value={tcInputCharged} onChange={e => setTcInputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Claude Output row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Claude — Output Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Sonnet 4.6 · per 1M output tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>${SC_CLAUDE_OUTPUT_RATE.toFixed(2)}/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="1" min="0" value={tcOutputCharged} onChange={e => setTcOutputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: save + reset */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {tcError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{tcError}</p>}
                      {companyId && hasOverride('training_coach') && (
                        <button onClick={() => handleReset('training_coach')} disabled={resetting === 'training_coach'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {resetting === 'training_coach' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                        </button>
                      )}
                    </div>
                    <button onClick={handleSaveTrainingCoachPricing} disabled={savingTc} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {savingTc ? <Loader2 size={13} className="animate-spin" /> : savedTc ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {savedTc ? 'Saved' : 'Save Pricing'}
                    </button>
                  </div>
                </>
              </div>
            )
          }

          // ── Skip Tracing: per-credit Tracerfy pricing ────────────────────
          if (app === 'skip_tracing') {
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                        {APP_LABELS[app]}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Per-Credit Pricing
                      </span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('skip_tracing') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('skip_tracing') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('skip_tracing') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('skip_tracing') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 160px', gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Flow Type</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Credits / Hit</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                  </div>

                  {[
                    { label: 'Normal Skiptrace',   credits: 1, rate: 0.02, value: stNormalCharged,   set: setStNormalCharged,   unit: '/hit' },
                    { label: 'Advanced Skiptrace',  credits: 2, rate: 0.04, value: stAdvancedCharged, set: setStAdvancedCharged, unit: '/hit' },
                    { label: 'Parcel (APN) Trace',  credits: 5, rate: 0.10, value: stApnCharged,      set: setStApnCharged,      unit: '/hit' },
                    { label: 'DNC Scrubbing',       credits: 1, rate: 0.02, value: stDncCharged,      set: setStDncCharged,      unit: '/phone' },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 160px', gap: 12, alignItems: 'center', marginBottom: i < arr.length - 1 ? 10 : 20 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: 0 }}>{row.label}</p>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>{row.credits} credit{row.credits > 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={refBadgeStyle}>${row.rate.toFixed(4)}{row.unit}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                          <input type="number" step="0.001" min="0" value={row.value} onChange={e => row.set(e.target.value)} style={inputStyle} />
                          <span style={{ fontSize: 11, color: C.dimText }}>{row.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Footer: save + reset */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {stError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{stError}</p>}
                      {companyId && hasOverride('skip_tracing') && (
                        <button onClick={() => handleReset('skip_tracing')} disabled={resetting === 'skip_tracing'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {resetting === 'skip_tracing' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                        </button>
                      )}
                    </div>
                    <button onClick={handleSaveSkipTracingPricing} disabled={savingSt} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {savingSt ? <Loader2 size={13} className="animate-spin" /> : savedSt ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {savedSt ? 'Saved' : 'Save Pricing'}
                    </button>
                  </div>
                </>
              </div>
            )
          }

          // ── Note Taker: Whisper + GPT per-component pricing ──────────────
          if (app === 'note_taker') {
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>{APP_LABELS[app]}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per-Component Pricing</span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('note_taker') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('note_taker') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('note_taker') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('note_taker') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Component</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                  </div>

                  {/* Whisper row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>OpenAI Whisper</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Per API call</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>$0.0060/min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.001" min="0" value={ntWhisperCharged} onChange={e => setNtWhisperCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ min</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.border}`, margin: '4px 0 12px' }} />

                  {/* GPT Input row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>GPT — Input Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>gpt-5.4-mini · per 1M input tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>$0.75/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.1" min="0" value={ntGptInputCharged} onChange={e => setNtGptInputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* GPT Output row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>GPT — Output Tokens</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>gpt-5.4-mini · per 1M output tokens</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>$4.50/1M tokens</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.5" min="0" value={ntGptOutputCharged} onChange={e => setNtGptOutputCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ 1M</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: save + reset */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ntError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{ntError}</p>}
                      {companyId && hasOverride('note_taker') && (
                        <button onClick={() => handleReset('note_taker')} disabled={resetting === 'note_taker'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {resetting === 'note_taker' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                        </button>
                      )}
                    </div>
                    <button onClick={handleSaveNoteTakerPricing} disabled={savingNt} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {savingNt ? <Loader2 size={13} className="animate-spin" /> : savedNt ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {savedNt ? 'Saved' : 'Save Pricing'}
                    </button>
                  </div>
                </>
              </div>
            )
          }

          // ── Data Enrichment: per-call Axesso pricing ─────────────────────
          if (app === 'data_enrichment') {
            return (
              <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>{APP_LABELS[app]}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#43B749', background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)', borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Per-Call Pricing</span>
                      {companyId && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.06em', background: hasOverride('data_enrichment') ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)', border: hasOverride('data_enrichment') ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)', color: hasOverride('data_enrichment') ? '#FCAF17' : C.dimText }}>
                          {hasOverride('data_enrichment') ? 'Override' : 'Using Global'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dimText, margin: 0 }}>{APP_DESC[app]}</p>
                  </div>
                </div>

                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>API</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Provider Rate</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Charged Price</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.white, margin: '0 0 2px' }}>Axesso</p>
                      <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>Per API call</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <span style={refBadgeStyle}>$0.0016/call</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.dimText }}>$</span>
                        <input type="number" step="0.0001" min="0" value={deCallCharged} onChange={e => setDeCallCharged(e.target.value)} style={inputStyle} />
                        <span style={{ fontSize: 11, color: C.dimText }}>/ call</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {deError && <p style={{ fontSize: 11, color: C.red, margin: 0 }}>{deError}</p>}
                      {companyId && hasOverride('data_enrichment') && (
                        <button onClick={() => handleReset('data_enrichment')} disabled={resetting === 'data_enrichment'} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)', color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {resetting === 'data_enrichment' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset to Global
                        </button>
                      )}
                    </div>
                    <button onClick={handleSaveDataEnrichmentPricing} disabled={savingDe} className="btn-primary" style={{ padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {savingDe ? <Loader2 size={13} className="animate-spin" /> : savedDe ? <CheckCircle2 size={13} /> : <Save size={13} />}
                      {savedDe ? 'Saved' : 'Save Pricing'}
                    </button>
                  </div>
                </>
              </div>
            )
          }

          // ── Other apps: multiplier row ────────────────────────────────────
          const isOverride     = hasOverride(app)
          const globalFallback = globalMultiplier(app)
          const lastUpdated    = config.find(
            r => (companyId ? r.company_id === companyId : r.company_id === null) && r.app === app
          )?.updated_at

          return (
            <div key={app} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                {/* Left: app info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0 }}>
                      {APP_LABELS[app] ?? app}
                    </p>
                    {companyId && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 5,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: isOverride ? 'rgba(252,175,23,0.12)' : 'rgba(255,255,255,0.05)',
                        border:     isOverride ? '1px solid rgba(252,175,23,0.25)' : '1px solid rgba(255,255,255,0.08)',
                        color:      isOverride ? '#FCAF17' : C.dimText,
                      }}>
                        {isOverride ? 'Override' : 'Using global'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: C.dimText, margin: '0 0 3px' }}>{APP_DESC[app]}</p>
                  {companyId && !isOverride && (
                    <p style={{ fontSize: 11, color: C.dimText, margin: 0 }}>
                      Global Default: <strong style={{ color: '#78ABD6' }}>{globalFallback}×</strong>
                    </p>
                  )}
                  {lastUpdated && (
                    <p style={{ fontSize: 11, color: C.dimText, margin: '2px 0 0' }}>
                      Last Updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Right: multiplier input + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        step="0.05"
                        min="1"
                        value={values[app] ?? ''}
                        onChange={(e) => setValues(v => ({ ...v, [app]: e.target.value }))}
                        style={{
                          width: 100, padding: '9px 12px', borderRadius: 9,
                          background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                          color: C.white, fontSize: 15, fontWeight: 700, textAlign: 'center',
                          outline: 'none', fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <button
                        onClick={() => handleSave(app)}
                        disabled={saving === app || resetting === app}
                        className="btn-primary"
                        style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {saving === app
                          ? <Loader2 size={13} className="animate-spin" />
                          : saved === app
                            ? <CheckCircle2 size={13} />
                            : <Save size={13} />
                        }
                        {saved === app ? 'Saved' : 'Save'}
                      </button>

                      {companyId && isOverride && (
                        <button
                          onClick={() => handleReset(app)}
                          disabled={resetting === app || saving === app}
                          title="Remove Override — Revert To Global Default"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '9px 13px', borderRadius: 9,
                            background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.18)',
                            color: '#ED1F24', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {resetting === app
                            ? <Loader2 size={12} className="animate-spin" />
                            : <RotateCcw size={12} />
                          }
                          Reset
                        </button>
                      )}
                    </div>
                    {errors[app] && (
                      <p style={{ fontSize: 11, color: C.red, margin: 0, textAlign: 'right' }}>{errors[app]}</p>
                    )}
                  </div>

                  {/* Markup badge */}
                  <div style={{
                    padding: '6px 12px', borderRadius: 999, minWidth: 64, textAlign: 'center',
                    background: 'rgba(67,183,73,0.10)', border: '1px solid rgba(67,183,73,0.2)',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.green, margin: 0 }}>
                      {markupPct(app)}
                    </p>
                    <p style={{ fontSize: 9, color: C.dimText, margin: '1px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>markup</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PlatformShell>
  )
}
