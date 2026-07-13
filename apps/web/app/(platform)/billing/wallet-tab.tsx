'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { CreditCard, Plus, Trash2, Check, Loader2, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw, Mic, Building2, GraduationCap, NotebookPen, Database, Search } from 'lucide-react'
import { C } from '@/components/platform/brand'
import type { Transaction } from './billing-client'
import type { Access } from '@/components/platform/PlatformShell'
import type { TopUpOption } from '@kpidriver/stripe/topup'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary:    C.green,
    colorBackground: C.card,
    colorText:       '#FFFFFF',
    colorDanger:     C.red,
    borderRadius:    '10px',
  },
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: '#FFFFFF',
      iconColor: C.green,
      '::placeholder': { color: C.dimText },
    },
    invalid: { color: C.red, iconColor: C.red },
  },
}

interface SavedPaymentMethod {
  id:   string
  card: { brand: string; last4: string; exp_month: number; exp_year: number } | null
}

interface AutoTopup {
  enabled:   boolean
  priceId:   string | null
  threshold: number | null
}

interface Props {
  balance:      number
  transactions: Transaction[]
  topUpOptions: TopUpOption[]
  autoTopup:    AutoTopup
  access:       Access
}

export default function WalletTab({ balance: initialBalance, transactions, topUpOptions, autoTopup, access }: Props) {
  const [balance, setBalance]         = useState(initialBalance)
  const [toppingUp, setToppingUp]     = useState<string | null>(null)
  const [topupMessage, setTopupMessage] = useState<string | null>(null)
  const [topupError, setTopupError]   = useState<string | null>(null)

  async function handleTopUp(priceId: string) {
    setToppingUp(priceId)
    setTopupError(null)
    setTopupMessage(null)
    try {
      const res = await fetch('/api/stripe/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json() as {
        url?:        string
        success?:    boolean
        newBalance?: number
        amount?:     number
        error?:      string
      }

      if (data.url) {
        // No saved card or 3DS required — open Stripe Checkout
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else if (data.success && data.newBalance !== undefined) {
        // One-click success
        setBalance(data.newBalance)
        const option = topUpOptions.find((o) => o.priceId === priceId)
        setTopupMessage(`+$${option?.amount ?? data.amount ?? ''} added to your wallet`)
        setTimeout(() => setTopupMessage(null), 5000)
      } else if (data.error) {
        setTopupError(data.error)
      }
    } catch {
      setTopupError('Something went wrong. Please try again.')
    } finally {
      setToppingUp(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Balance hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(48,125,192,0.10), rgba(67,183,73,0.06))',
        border: `1px solid ${C.border}`, borderRadius: 16, padding: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: topupMessage || topupError ? 16 : 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 8px' }}>
              Wallet Balance
            </p>
            <p style={{ fontSize: 40, fontWeight: 900, color: C.white, margin: 0, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ${balance.toFixed(2)}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topUpOptions.map((o) => (
              <button
                key={o.priceId}
                onClick={() => handleTopUp(o.priceId)}
                disabled={toppingUp !== null}
                className="btn-primary"
                style={{ padding: '9px 15px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {toppingUp === o.priceId
                  ? <Loader2 size={13} className="animate-spin" />
                  : null}
                + {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inline feedback */}
        {topupMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(67,183,73,0.12)', border: `1px solid rgba(67,183,73,0.25)` }}>
            <CheckCircle2 size={15} style={{ color: C.green, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: C.green }}>{topupMessage}</span>
          </div>
        )}
        {topupError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(237,31,36,0.10)', border: `1px solid rgba(237,31,36,0.25)` }}>
            <AlertCircle size={15} style={{ color: C.red, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: C.red }}>{topupError}</span>
          </div>
        )}
      </div>

      <AutoTopUpCard topUpOptions={topUpOptions} autoTopup={autoTopup} />
      <PaymentMethodsCard />
      <AppSpendCard transactions={transactions} access={access} />
    </div>
  )
}

/* ── Auto Top-Up ────────────────────────────────────────────────── */

function AutoTopUpCard({ topUpOptions, autoTopup }: { topUpOptions: TopUpOption[]; autoTopup: AutoTopup }) {
  const [enabled,   setEnabled]   = useState(autoTopup.enabled)
  const [priceId,   setPriceId]   = useState<string>(autoTopup.priceId ?? topUpOptions[0]?.priceId ?? '')
  const [threshold, setThreshold] = useState<string>(autoTopup.threshold != null ? String(autoTopup.threshold) : '')
  const [saving,    setSaving]    = useState(false)
  const [message,   setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function save() {
    if (enabled && !threshold) {
      setMessage({ type: 'error', text: 'Threshold amount is required.' })
      return
    }
    const parsed = parseFloat(threshold)
    if (enabled && (isNaN(parsed) || parsed <= 0)) {
      setMessage({ type: 'error', text: 'Enter a valid threshold greater than $0.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/billing/auto-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, priceId: enabled ? priceId : null, threshold: enabled ? parsed : null }),
      })
      const data = await res.json()
      if (!res.ok) setMessage({ type: 'error', text: data.error ?? 'Failed to save.' })
      else setMessage({ type: 'success', text: 'Auto top-up settings saved.' })
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: enabled ? `1px solid ${C.border}` : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(252,175,23,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={15} style={{ color: '#FCAF17' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Auto Top-Up</p>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: '2px 0 0' }}>
              Automatically recharge when your wallet balance gets low
            </p>
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={() => setEnabled(v => !v)}
          style={{
            width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
            background: enabled ? C.green : 'rgba(255,255,255,0.12)', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            position: 'absolute', top: 4, left: enabled ? 22 : 4,
            width: 16, height: 16, borderRadius: 8, background: '#fff', transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Body — only when enabled */}
      {enabled && (
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Amount selector */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 8px' }}>
              Top-Up Amount
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {topUpOptions.map(o => (
                <button
                  key={o.priceId}
                  onClick={() => setPriceId(o.priceId)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: priceId === o.priceId ? C.blue : 'rgba(255,255,255,0.06)',
                    color: priceId === o.priceId ? '#fff' : C.dimText,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Threshold input */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.dimText, margin: '0 0 8px' }}>
              Top-Up When Balance Drops Below <span style={{ color: C.red }}>*</span>
            </p>
            <div style={{ position: 'relative', maxWidth: 200 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 600, color: C.dimText }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 50"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 24px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                  fontSize: 13, fontWeight: 600, color: C.text, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: C.dimText, margin: '6px 0 0' }}>
              When your balance falls below this amount, we'll automatically charge your default card.
            </p>
          </div>

          {/* Feedback */}
          {message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
              background: message.type === 'success' ? 'rgba(67,183,73,0.12)' : 'rgba(237,31,36,0.10)',
              border: `1px solid ${message.type === 'success' ? 'rgba(67,183,73,0.25)' : 'rgba(237,31,36,0.25)'}`,
            }}>
              {message.type === 'success'
                ? <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0 }} />
                : <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: message.type === 'success' ? C.green : C.red }}>
                {message.text}
              </span>
            </div>
          )}

          {/* Save */}
          <div>
            <button onClick={save} disabled={saving} className="btn-primary" style={{ padding: '9px 20px' }}>
              {saving && <Loader2 size={13} className="animate-spin" />}
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Payment methods ────────────────────────────────────────────── */

function PaymentMethodsCard() {
  const [methods, setMethods]           = useState<SavedPaymentMethod[] | null>(null)
  const [defaultId, setDefaultId]       = useState<string | null>(null)
  const [adding, setAdding]             = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [busyId, setBusyId]             = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/payment-methods')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMethods(data.paymentMethods)
      setDefaultId(data.defaultPaymentMethodId)
    } catch {
      setError('Failed to load payment methods.')
    }
  }, [])

  useEffect(() => { fetchMethods() }, [fetchMethods])

  async function startAddCard() {
    setError(null)
    try {
      const res = await fetch('/api/stripe/setup-intent', { method: 'POST' })
      if (!res.ok) throw new Error()
      const { clientSecret } = await res.json()
      setClientSecret(clientSecret)
      setAdding(true)
    } catch {
      setError('Could not start card setup.')
    }
  }

  function onCardAdded() {
    setAdding(false)
    setClientSecret(null)
    fetchMethods()
  }

  async function setDefault(id: string) {
    setBusyId(id)
    await fetch('/api/stripe/payment-methods/default', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: id }),
    })
    await fetchMethods()
    setBusyId(null)
  }

  async function removeCard(id: string) {
    setBusyId(id)
    await fetch('/api/stripe/payment-methods/remove', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: id }),
    })
    await fetchMethods()
    setBusyId(null)
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Payment Methods</p>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.dimText, margin: '2px 0 0' }}>
            Default card is charged instantly on top-up — no redirect needed
          </p>
        </div>
        {!adding && (
          <button onClick={startAddCard} className="btn-primary" style={{ padding: '8px 14px', fontSize: 11 }}>
            <Plus size={13} /> Add card
          </button>
        )}
      </div>

      {error && <p style={{ color: C.red, fontSize: 12, padding: '10px 22px 0', margin: 0 }}>{error}</p>}

      {adding && clientSecret && (
        <div style={{ padding: '20px 22px', borderBottom: `1px solid ${C.border}` }}>
          <Elements stripe={stripePromise} options={{ appearance: STRIPE_APPEARANCE }}>
            <AddCardForm
              clientSecret={clientSecret}
              onSuccess={onCardAdded}
              onCancel={() => { setAdding(false); setClientSecret(null) }}
            />
          </Elements>
        </div>
      )}

      <div>
        {methods === null ? (
          <div style={{ padding: '32px 22px', textAlign: 'center' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: C.dimText }} />
          </div>
        ) : methods.length === 0 ? (
          <div style={{ padding: '32px 22px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: C.dimText, margin: 0 }}>
              No saved cards yet. Add one above for instant one-click top-ups.
            </p>
          </div>
        ) : (
          methods.map((m) => {
            const isDefault = m.id === defaultId
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(48,125,192,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={16} style={{ color: C.blue }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                    {m.card?.brand} •••• {m.card?.last4}
                  </p>
                  <p style={{ fontSize: 11, color: C.dimText, margin: '2px 0 0' }}>
                    Expires {String(m.card?.exp_month).padStart(2, '0')}/{m.card?.exp_year}
                  </p>
                </div>
                {isDefault ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: C.green, background: 'rgba(67,183,73,0.12)', padding: '3px 9px', borderRadius: 999 }}>
                    <Check size={11} /> Default
                  </span>
                ) : (
                  <button
                    onClick={() => setDefault(m.id)} disabled={busyId === m.id}
                    style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => removeCard(m.id)} disabled={busyId === m.id}
                  style={{ color: C.dimText, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ── Add card form (must live inside <Elements>) ───────────────── */

function AddCardForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const card = elements?.getElement(CardElement)
    if (!stripe || !card) return
    setSubmitting(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmCardSetup(clientSecret, { payment_method: { card } })
    if (confirmError) {
      setError(confirmError.message ?? 'Could not save card.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)' }}>
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <p style={{ color: C.red, fontSize: 12, margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={!stripe || submitting} className="btn-primary" style={{ flex: 1 }}>
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Save card
        </button>
        <button
          type="button" onClick={onCancel} disabled={submitting}
          style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.mutedText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ── App spend summary ──────────────────────────────────────────── */

const APP_ENTRIES: { appKey: string; accessKey: keyof Access; label: string; color: string; bg: string; Icon: React.ElementType }[] = [
  { appKey: 'sales_coach',     accessKey: 'salesCoach',     label: 'Sales Coach',      color: C.blue,    bg: 'rgba(48,125,192,0.12)',  Icon: Mic          },
  { appKey: 'training_coach',  accessKey: 'trainingCoach',  label: 'Training Coach',   color: '#FCAF17', bg: 'rgba(252,175,23,0.12)',  Icon: GraduationCap },
  { appKey: 'underwriting',    accessKey: 'underwriting',   label: 'Deal Underwriter', color: C.green,   bg: 'rgba(67,183,73,0.12)',   Icon: Building2    },
  { appKey: 'note_taker',      accessKey: 'noteTaker',      label: 'Note Taker',       color: C.blue,    bg: 'rgba(48,125,192,0.12)',  Icon: NotebookPen  },
  { appKey: 'data_enrichment', accessKey: 'dataEnrichment', label: 'Data Enrichment',  color: C.green,   bg: 'rgba(67,183,73,0.12)',   Icon: Database     },
  { appKey: 'skip_tracing',    accessKey: 'skipTracing',    label: 'Skip Tracing',     color: '#FCAF17', bg: 'rgba(252,175,23,0.12)',  Icon: Search       },
]

function AppSpendCard({ transactions, access }: { transactions: Transaction[]; access: Access }) {
  const spend = useMemo(() => {
    const map: Record<string, { total: number; runs: number }> = {}
    for (const t of transactions) {
      if (t.type !== 'deduction' || !t.app) continue
      if (!map[t.app]) map[t.app] = { total: 0, runs: 0 }
      map[t.app].total += t.amount_usd
      map[t.app].runs  += 1
    }
    return map
  }, [transactions])

  const rows = APP_ENTRIES.filter(e => access[e.accessKey])

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>App Usage</p>
        <p style={{ fontSize: 12, color: C.dimText, margin: '3px 0 0' }}>Total wallet spend per app, all time</p>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '32px 22px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: C.dimText, margin: 0 }}>No apps unlocked yet.</p>
        </div>
      ) : (
        <div>
          {rows.map((e, i) => {
            const s = spend[e.appKey]
            const total = s?.total ?? 0
            const runs  = s?.runs  ?? 0
            const Icon  = e.Icon
            return (
              <div key={e.appKey} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: e.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={15} style={{ color: e.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{e.label}</p>
                  <p style={{ fontSize: 11, color: C.dimText, margin: '2px 0 0' }}>
                    {runs > 0 ? `${runs} run${runs !== 1 ? 's' : ''}` : 'No usage yet'}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: total > 0 ? C.text : C.dimText, fontVariantNumeric: 'tabular-nums' }}>
                  ${total.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
