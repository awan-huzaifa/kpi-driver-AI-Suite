'use client'

import { useState, useTransition } from 'react'
import { Loader2, Save, CheckCircle2, RotateCcw, Globe, Building2 } from 'lucide-react'
import type { PlanId } from '@kpidriver/auth/types'
import PlatformShell, { type Access } from '@/components/platform/PlatformShell'
import { C } from '@/components/platform/brand'
import { updateBillingMultiplier, clearCompanyMultiplier } from '@/app/actions/super-admin/billing-config'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'

interface ConfigRow {
  id:         string
  app:        string
  multiplier: number
  company_id: string | null
  updated_at: string
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
  skip_tracing:   'Skip Tracing',
}

const APP_DESC: Record<string, string> = {
  underwriting:   'Applied to each deal underwriting pipeline run.',
  sales_coach:    'Applied to each live call scored.',
  training_coach: 'Applied to each training call scored.',
  note_taker:     'Applied to each call note generated.',
  data_enrichment:'Applied to each data enrichment record.',
  skip_tracing:   'Applied to each skip trace / APN / DNC lookup.',
}

const ALL_APPS = ['underwriting', 'sales_coach', 'training_coach', 'note_taker', 'data_enrichment', 'skip_tracing']

export default function BillingConfigClient({ config, companies, currentUser, planId, access }: Props) {
  const [selectedCompany, setSelectedCompany] = useState<string>('global')

  // local input values keyed by app
  const getInitialValues = (companyId: string | null) =>
    Object.fromEntries(
      ALL_APPS.map((app) => {
        const override = companyId ? config.find(r => r.company_id === companyId && r.app === app) : null
        const global_  = config.find(r => r.company_id === null && r.app === app)
        return [app, String(override?.multiplier ?? global_?.multiplier ?? '3.0')]
      })
    )

  const [values, setValues] = useState<Record<string, string>>(getInitialValues(null))
  const [saving,  setSaving]  = useState<string | null>(null)
  const [saved,   setSaved]   = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  function handleCompanyChange(cid: string) {
    setSelectedCompany(cid)
    setErrors({})
    setSaved(null)
    setValues(getInitialValues(cid === 'global' ? null : cid))
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
      setErrors(e => ({ ...e, [app]: 'Must be ≥ 1 (1 = no markup, 1.3 = 30% markup)' }))
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
        setErrors(prev => ({ ...prev, [app]: e instanceof Error ? e.message : 'Failed to save' }))
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
        await clearCompanyMultiplier(app, companyId)
        setValues(v => ({ ...v, [app]: String(globalMultiplier(app)) }))
      } catch (e) {
        setErrors(prev => ({ ...prev, [app]: e instanceof Error ? e.message : 'Failed to reset' }))
      } finally {
        setResetting(null)
      }
    })
  }

  const markupPct = (app: string) => {
    const n = parseFloat(values[app] ?? '1')
    return isNaN(n) ? '—' : `+${Math.round((n - 1) * 100)}%`
  }

  return (
    <PlatformShell planId={planId} pageTitle="Billing Config">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          Billing Config
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
          Set AI cost markup multipliers per company. A company without an override uses the global default.
        </p>
      </div>

      {/* Info card */}
      <div style={{ background: 'rgba(48,125,192,0.08)', border: '1px solid rgba(48,125,192,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: C.bodyText, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: C.white }}>Example:</strong> If an underwriting run costs $0.05 and the multiplier is 1.3,
          the company wallet is deducted <strong style={{ color: C.green }}>$0.065</strong> (30% markup).
          Multiplier <strong style={{ color: C.white }}>1.0</strong> = no markup.
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
            <SelectTrigger placeholder="Select company" className="w-auto min-w-[200px] text-sm" />
            <SelectContent>
              <SelectItem value="global">🌐 Global Defaults</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* App rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ALL_APPS.map((app) => {
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
                    {/* Override / default badge */}
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
                      Global default: <strong style={{ color: '#78ABD6' }}>{globalFallback}×</strong>
                    </p>
                  )}
                  {lastUpdated && (
                    <p style={{ fontSize: 11, color: C.dimText, margin: '2px 0 0' }}>
                      Last updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Right: input + actions */}
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

                      {/* Reset to global — only shown when viewing a company that has an override */}
                      {companyId && isOverride && (
                        <button
                          onClick={() => handleReset(app)}
                          disabled={resetting === app || saving === app}
                          title="Remove override — revert to global default"
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
