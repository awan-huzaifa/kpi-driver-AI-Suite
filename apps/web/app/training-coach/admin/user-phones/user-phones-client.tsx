'use client'

import { useState, useTransition, useMemo } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { addPhoneForUser, removePhoneAdmin } from '@/app/actions/training-coach/phones'
import { C } from '@/components/platform/brand'

interface Company  { id: string; name: string }
interface UserRow  { id: string; full_name: string | null; company_id: string | null; agent_type: string | null }
interface PhoneRow { id: string; user_id: string; phone: string }

interface Props {
  companies: Company[]
  users:     UserRow[]
  phones:    PhoneRow[]
}

export default function UserPhonesClient({ companies, users, phones: initialPhones }: Props) {
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [phones, setPhones]               = useState(initialPhones)
  const [addingFor, setAddingFor]         = useState<string | null>(null)
  const [newPhone, setNewPhone]           = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies])

  const filteredUsers = useMemo(
    () => companyFilter === 'all' ? users : users.filter(u => u.company_id === companyFilter),
    [users, companyFilter]
  )

  function userPhones(userId: string) {
    return phones.filter(p => p.user_id === userId)
  }

  function openAdd(userId: string) {
    setAddingFor(userId)
    setNewPhone('')
    setError(null)
  }

  function closeAdd() {
    setAddingFor(null)
    setNewPhone('')
    setError(null)
  }

  function handleAdd(userId: string) {
    if (!newPhone.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await addPhoneForUser(userId, newPhone.trim())
        setPhones(prev => [...prev, { id: crypto.randomUUID(), user_id: userId, phone: newPhone.trim() }])
        closeAdd()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add phone')
      }
    })
  }

  function handleRemove(phoneId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removePhoneAdmin(phoneId)
        setPhones(prev => prev.filter(p => p.id !== phoneId))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove phone')
      }
    })
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          User Phone Numbers
        </h1>
        <p style={{ fontSize: 14, color: C.bodyText, margin: 0 }}>
          Manage Training Coach phone numbers for users across all companies.
        </p>
      </div>

      {/* Company filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => { setCompanyFilter('all'); closeAdd() }}
          style={{
            padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: companyFilter === 'all' ? C.blue : 'rgba(255,255,255,0.06)',
            color:      companyFilter === 'all' ? '#fff' : C.bodyText,
          }}
        >
          All Companies
        </button>
        {companies.map(c => (
          <button
            key={c.id}
            onClick={() => { setCompanyFilter(c.id); closeAdd() }}
            style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: companyFilter === c.id ? C.blue : 'rgba(255,255,255,0.06)',
              color:      companyFilter === c.id ? '#fff' : C.bodyText,
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: C.red, fontSize: 13, marginBottom: 14 }}>{error}</p>
      )}

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: C.dimText, fontSize: 13 }}>
          No active users found.
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>All Users</p>
            <span style={{ fontSize: 12, color: C.dimText }}>{filteredUsers.length} users</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Name', 'Company', 'Agent Type', 'Phone Numbers', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left',
                      padding: i === 0 ? '10px 22px' : i === 4 ? '10px 22px' : '10px 14px',
                      fontSize: 10, fontWeight: 700, color: C.dimText,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const uPhones  = userPhones(u.id)
                  const isAdding = addingFor === u.id
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      {/* Name */}
                      <td style={{ padding: '14px 22px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.full_name ?? '—'}</span>
                      </td>

                      {/* Company */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, color: C.bodyText }}>
                          {u.company_id ? (companyMap[u.company_id] ?? '—') : '—'}
                        </span>
                      </td>

                      {/* Agent type */}
                      <td style={{ padding: '14px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: C.dimText,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {u.agent_type ?? 'none'}
                        </span>
                      </td>

                      {/* Phones + inline add */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {uPhones.length === 0 && !isAdding && (
                            <span style={{ fontSize: 12, color: C.dimText }}>No numbers yet</span>
                          )}

                          {uPhones.map(p => (
                            <span key={p.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 20,
                              background: 'rgba(48,125,192,0.12)', border: '1px solid rgba(48,125,192,0.3)',
                              fontSize: 12, fontWeight: 600, color: C.blue, fontFamily: 'monospace',
                            }}>
                              {p.phone}
                              <button
                                onClick={() => handleRemove(p.id)}
                                disabled={isPending}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dimText, padding: 0, display: 'flex', lineHeight: 1 }}
                                onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                                onMouseLeave={e => (e.currentTarget.style.color = C.dimText)}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}

                          {isAdding && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                autoFocus
                                type="text"
                                value={newPhone}
                                onChange={e => setNewPhone(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAdd(u.id)
                                  if (e.key === 'Escape') closeAdd()
                                }}
                                placeholder="+15550000000"
                                style={{
                                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace',
                                  background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
                                  color: C.text, outline: 'none', width: 170,
                                }}
                              />
                              <button
                                onClick={() => handleAdd(u.id)}
                                disabled={isPending || !newPhone.trim()}
                                style={{
                                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                  background: C.blue, color: '#fff', fontSize: 12, fontWeight: 700,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  opacity: isPending || !newPhone.trim() ? 0.5 : 1,
                                }}
                              >
                                {isPending ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
                              </button>
                              <button
                                onClick={closeAdd}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dimText, padding: 2, display: 'flex' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Add button */}
                      <td style={{ padding: '14px 22px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {!isAdding && (
                          <button
                            onClick={() => openAdd(u.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                              background: 'transparent', border: `1px solid ${C.border}`,
                              color: C.bodyText, fontSize: 12, fontWeight: 600,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.bodyText }}
                          >
                            <Plus size={12} /> Add
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
