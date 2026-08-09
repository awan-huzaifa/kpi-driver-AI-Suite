'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle, FlaskConical, ChevronDown } from 'lucide-react'
import PlatformShell from '@/components/platform/PlatformShell'
import { C } from '@/components/platform/brand'
import { sendTestReportEmails, type TemplateId, type SendResult } from '@/app/actions/admin/email-test'

interface CompanyUser {
  id:    string
  name:  string
  email: string
  role:  string
}

const TEMPLATES = [
  { id: 'sc-team', label: 'Sales Coach — Team',     desc: 'Breakdown by agent type + per-rep leaderboard', role: 'admin' },
  { id: 'sc-rep',  label: 'Sales Coach — Rep',       desc: 'Rep scores, recent calls & coaching actions',   role: 'rep'   },
  { id: 'tc-team', label: 'Training Coach — Team',   desc: 'Team overview, top trainees & AI agents',       role: 'admin' },
  { id: 'tc-rep',  label: 'Training Coach — Rep',    desc: 'Rep training sessions & coaching actions',      role: 'rep'   },
  { id: 'uw-team', label: 'Underwriting — Team',     desc: 'All company deals with ARV & recommendations',  role: 'admin' },
  { id: 'uw-rep',  label: 'Underwriting — Rep',      desc: 'Rep\'s own deals only',                         role: 'rep'   },
]

const PERIODS = [
  { id: 'daily',   label: 'Daily',   desc: 'Yesterday'  },
  { id: 'weekly',  label: 'Weekly',  desc: 'Last 7 days' },
  { id: 'monthly', label: 'Monthly', desc: 'Last month'  },
]

function roleLabel(role: string) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return 'Rep'
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: `${color}20`, border: `1px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, color,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function EmailTestClient({
  currentUserId,
  currentUserEmail,
  companyUsers,
}: {
  currentUserId:    string
  currentUserEmail: string
  companyUsers:     CompanyUser[]
}) {
  const [repUserId, setRepUserId] = useState('')
  const [period,    setPeriod]    = useState('weekly')
  const [selected,  setSelected]  = useState<Set<string>>(new Set(TEMPLATES.map(t => t.id)))
  const [sending,   setSending]   = useState(false)
  const [results,   setResults]   = useState<(SendResult & { label: string })[] | null>(null)
  const [error,     setError]     = useState('')

  const repUser = companyUsers.find(u => u.id === repUserId)

  function toggleTemplate(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function selectAll()   { setSelected(new Set(TEMPLATES.map(t => t.id))) }
  function clearAll()    { setSelected(new Set()) }
  function selectAdmin() { setSelected(new Set(TEMPLATES.filter(t => t.role === 'admin').map(t => t.id))) }
  function selectRep()   { setSelected(new Set(TEMPLATES.filter(t => t.role === 'rep').map(t => t.id))) }

  async function handleSend() {
    if (selected.size === 0) { setError('Select at least one template'); return }
    setError('')
    setSending(true)
    setResults(null)

    try {
      const templateIds = TEMPLATES.filter(t => selected.has(t.id)).map(t => t.id) as TemplateId[]
      // Always send to current user's inbox — rep content uses repUserId's data
      const out = await sendTestReportEmails(templateIds, currentUserEmail, currentUserEmail, period as any, repUserId || undefined)
      setResults(out.map(r => ({
        ...r,
        label: TEMPLATES.find(t => t.id === r.template)?.label ?? r.template,
      })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <PlatformShell planId={null} pageTitle="Email Report Test">
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <FlaskConical size={20} style={{ color: C.blue }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.white, letterSpacing: '-0.02em', margin: 0 }}>
            Email Report Test
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#FCAF17',
            background: 'rgba(252,175,23,0.12)', border: '1px solid rgba(252,175,23,0.25)',
            borderRadius: 5, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>Dev Only</span>
        </div>
        <p style={{ fontSize: 13, color: C.bodyText, margin: 0 }}>
          All emails land in <strong style={{ color: C.white }}>{currentUserEmail}</strong>. Pick a rep below to preview their data in rep templates.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Rep preview picker */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
              Rep to Preview
            </p>
            <p style={{ fontSize: 12, color: C.dimText, margin: '0 0 14px' }}>
              Rep templates will show this person's data — but land in your inbox.
            </p>

            <div style={{ position: 'relative' }}>
              <select
                value={repUserId}
                onChange={e => setRepUserId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 36px 10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                  color: repUserId ? C.white : C.dimText, fontSize: 13, outline: 'none',
                  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                <option value="" style={{ background: '#1c1f26', color: '#94a3b8' }}>— First rep with data (default) —</option>
                {companyUsers.map(u => (
                  <option key={u.id} value={u.id} style={{ background: '#1c1f26', color: '#f1f5f9' }}>
                    {u.name} · {roleLabel(u.role)}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.dimText, pointerEvents: 'none' }} />
            </div>

            {/* Selected rep card */}
            {repUser && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(48,125,192,0.08)', border: `1px solid rgba(48,125,192,0.2)`,
              }}>
                <Avatar name={repUser.name} color={C.blue} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{repUser.name}</div>
                  <div style={{ fontSize: 11, color: C.dimText }}>{repUser.email} · {roleLabel(repUser.role)}</div>
                </div>
                <div style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>Preview as this rep</div>
              </div>
            )}

            {!repUser && (
              <div style={{ marginTop: 10, padding: '9px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.dimText }}>Rep templates will use the first rep with data in the selected period.</span>
              </div>
            )}
          </div>

          {/* Period */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              Report Period
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: period === p.id ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
                    background: period === p.id ? 'rgba(48,125,192,0.15)' : 'rgba(255,255,255,0.03)',
                    textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: period === p.id ? C.blue : C.white }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: C.dimText, marginTop: 2 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || selected.size === 0}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 24px', borderRadius: 12,
              cursor: sending || selected.size === 0 ? 'not-allowed' : 'pointer',
              background: sending || selected.size === 0 ? 'rgba(48,125,192,0.3)' : C.blue,
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              opacity: selected.size === 0 ? 0.5 : 1, transition: 'all 0.15s',
            }}
          >
            {sending
              ? <><Loader2 size={15} className="animate-spin" /> Sending {selected.size} email{selected.size !== 1 ? 's' : ''}…</>
              : <><Send size={15} /> Send {selected.size} Test Email{selected.size !== 1 ? 's' : ''} to Me</>
            }
          </button>

          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(237,31,36,0.08)', border: '1px solid rgba(237,31,36,0.2)' }}>
              <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.red }}>{error}</span>
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Templates */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Templates ({selected.size}/{TEMPLATES.length})
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ label: 'All', fn: selectAll }, { label: 'Admin', fn: selectAdmin }, { label: 'Reps', fn: selectRep }, { label: 'None', fn: clearAll }].map(btn => (
                  <button key={btn.label} onClick={btn.fn} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.bodyText,
                  }}>{btn.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TEMPLATES.map(tpl => {
                const isOn = selected.has(tpl.id)
                const rc   = tpl.role === 'admin'
                  ? { bg: 'rgba(48,125,192,0.15)', border: 'rgba(48,125,192,0.25)', color: C.blue }
                  : { bg: 'rgba(67,183,73,0.15)',  border: 'rgba(67,183,73,0.25)',  color: C.green }
                return (
                  <div
                    key={tpl.id}
                    onClick={() => toggleTemplate(tpl.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                      border: isOn ? `1px solid ${C.blue}` : `1px solid ${C.border}`,
                      background: isOn ? 'rgba(48,125,192,0.08)' : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <div style={{
                      width: 17, height: 17, borderRadius: 5, flexShrink: 0, marginTop: 1,
                      border: isOn ? `2px solid ${C.blue}` : `2px solid ${C.border}`,
                      background: isOn ? C.blue : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.12s',
                    }}>
                      {isOn && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isOn ? C.white : C.bodyText }}>{tpl.label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '1px 6px', borderRadius: 4,
                          background: rc.bg, border: `1px solid ${rc.border}`, color: rc.color,
                        }}>{tpl.role}</span>
                      </div>
                      <span style={{ fontSize: 11, color: C.dimText }}>{tpl.desc}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Results */}
          {results && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
                Results
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 9,
                    background: r.ok ? 'rgba(67,183,73,0.06)' : 'rgba(237,31,36,0.06)',
                    border: r.ok ? '1px solid rgba(67,183,73,0.2)' : '1px solid rgba(237,31,36,0.2)',
                  }}>
                    {r.ok
                      ? <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0, marginTop: 1 }} />
                      : <AlertCircle  size={14} style={{ color: C.red,   flexShrink: 0, marginTop: 1 }} />
                    }
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: r.ok ? C.green : C.red }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: C.dimText }}>→ {r.to}</div>
                      {r.error && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{r.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: C.dimText, margin: '10px 0 0' }}>
                Check <strong style={{ color: C.white }}>{currentUserEmail}</strong> — subjects prefixed with [TEST].
              </p>
            </div>
          )}
        </div>
      </div>
    </PlatformShell>
  )
}
