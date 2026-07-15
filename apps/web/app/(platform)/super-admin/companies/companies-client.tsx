'use client'

import { useState, useTransition } from 'react'
import { Building2, Plus, Pencil, Trash2, X, Loader2, AlertTriangle } from 'lucide-react'
import type { PlanId } from '@kpidriver/auth/types'
import PlatformShell, { type Access } from '@/components/platform/PlatformShell'
import { C } from '@/components/platform/brand'
import { createCompany, updateCompanyAdmin, deleteCompany } from '@/app/actions/super-admin/companies'

interface Company {
  id:                  string
  name:                string
  ghl_sub_account_id:  string | null
  stripe_customer_id:  string | null
  wallet_balance:      number
  created_at:          string
  user_count:          number
}

interface Props {
  companies:   Company[]
  currentUser: { email: string; fullName: string | null }
  planId:      PlanId | null
  access:      Access
}

interface FormState {
  name:               string
  ghl_sub_account_id: string
  stripe_customer_id: string
}

const EMPTY_FORM: FormState = { name: '', ghl_sub_account_id: '', stripe_customer_id: '' }

export default function CompaniesClient({ companies: initial, currentUser, planId, access }: Props) {
  const [companies, setCompanies] = useState(initial)
  const [modal, setModal]         = useState<'create' | Company | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [error, setError]             = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [isPending, startTransition]  = useTransition()

  function openCreate() {
    setForm(EMPTY_FORM)
    setError(null)
    setModal('create')
  }

  function openEdit(c: Company) {
    setForm({
      name:               c.name,
      ghl_sub_account_id: c.ghl_sub_account_id ?? '',
      stripe_customer_id: c.stripe_customer_id ?? '',
    })
    setError(null)
    setModal(c)
  }

  function closeModal() { setModal(null); setError(null) }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        await deleteCompany(deleteTarget.id)
        setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id))
        setDeleteTarget(null)
      } catch (e) {
        setDeleteTarget(null)
        setError(e instanceof Error ? e.message : 'Delete failed')
      }
    })
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('Company name is required'); return }
    setError(null)
    startTransition(async () => {
      try {
        if (modal === 'create') {
          await createCompany(form)
          // Optimistic add — page will revalidate on next load
        } else if (modal && typeof modal === 'object') {
          await updateCompanyAdmin(modal.id, form)
          setCompanies((prev) => prev.map((c) =>
            c.id === modal.id
              ? { ...c, name: form.name, ghl_sub_account_id: form.ghl_sub_account_id || null, stripe_customer_id: form.stripe_customer_id || null }
              : c
          ))
        }
        closeModal()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  const isEditing = modal !== null && modal !== 'create'

  return (
    <PlatformShell planId={planId} pageTitle="Companies">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            Companies
          </h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.bodyText, margin: 0 }}>
            Manage all client companies, their GHL accounts, and Stripe customers.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={15} /> New Company
        </button>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>All Companies</p>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText }}>{companies.length} total</span>
        </div>

        {companies.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px', background: 'rgba(48,125,192,0.10)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} style={{ color: C.blue }} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>No companies yet</p>
            <p style={{ fontSize: 13, color: C.dimText, margin: 0 }}>Click "New Company" to add your first client.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Company', 'GHL Sub-Account ID', 'Stripe Customer ID', 'Wallet', 'Users', 'Created', ''].map((h, i) => (
                  <th key={h || i} style={{
                    textAlign: i >= 3 && i <= 4 ? 'right' : 'left',
                    padding: i === 0 ? '10px 22px' : i === 6 ? '10px 22px' : '10px 12px',
                    fontSize: 10, fontWeight: 700, color: C.dimText,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '14px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(48,125,192,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={14} style={{ color: C.blue }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ fontSize: 12, color: c.ghl_sub_account_id ? C.bodyText : C.dimText, fontFamily: 'monospace' }}>
                      {c.ghl_sub_account_id ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ fontSize: 12, color: c.stripe_customer_id ? C.green : C.dimText, fontFamily: 'monospace' }}>
                      {c.stripe_customer_id ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: (c.wallet_balance ?? 0) > 0 ? C.green : C.dimText, fontVariantNumeric: 'tabular-nums' }}>
                      ${(c.wallet_balance ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 13, color: C.bodyText }}>{c.user_count}</span>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{ fontSize: 12, color: C.dimText }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={{ padding: '14px 22px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.dimText, padding: 4 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.dimText, padding: 4 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.dimText)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.white, margin: 0 }}>
                {modal === 'create' ? 'New Company' : 'Edit Company'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dimText }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Company Name *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Acme Real Estate" />
              <Field label="GHL Sub-Account ID" value={form.ghl_sub_account_id} onChange={(v) => setForm((f) => ({ ...f, ghl_sub_account_id: v }))} placeholder="abc123xyz" mono />
              <Field
                label="Stripe Customer ID"
                value={form.stripe_customer_id}
                onChange={(v) => setForm((f) => ({ ...f, stripe_customer_id: v }))}
                placeholder="cus_xxxxxxxxxx"
                mono
                hint="Paste the existing Stripe customer ID from GHL. One-click top-up will use this customer's saved card."
              />
            </div>

            {error && <p style={{ color: C.red, fontSize: 12, margin: '16px 0 0' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {modal === 'create' ? 'Create Company' : 'Save Changes'}
              </button>
              <button
                onClick={closeModal}
                disabled={isPending}
                style={{ padding: '10px 18px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.mutedText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(237,31,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: C.red }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: C.white, margin: 0 }}>Delete Company</p>
                <p style={{ fontSize: 12, color: C.dimText, margin: '2px 0 0' }}>This action cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.bodyText, margin: '0 0 24px', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: C.white }}>{deleteTarget.name}</strong>?
              All associated users, calls, and wallet data will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={isPending}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: C.red, color: '#fff', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Delete Company
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                style={{ padding: '10px 18px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.mutedText, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </PlatformShell>
  )
}

function Field({ label, value, onChange, placeholder, mono, hint }: {
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder: string
  mono?:       boolean
  hint?:       string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.dimText, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', borderRadius: 9,
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
          color: C.text, fontSize: mono ? 12 : 13, fontFamily: mono ? 'monospace' : undefined,
          outline: 'none',
        }}
      />
      {hint && <p style={{ fontSize: 11, color: C.dimText, margin: '5px 0 0', lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}
