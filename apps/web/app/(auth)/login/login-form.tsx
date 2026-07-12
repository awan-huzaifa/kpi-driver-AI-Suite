'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@kpidriver/auth/client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Mail, Lock, ArrowRight, AlertCircle,
  Building2, Mic, FileText, Database, Clock,
  Eye, EyeOff,
} from 'lucide-react'
import Image from 'next/image'
import ParticlesBg from '@/components/ui/particles-bg'

const PRODUCTS = [
  {
    icon:      Building2,
    name:      'Deal Underwriter',
    tagline:   'AI underwriting in minutes',
    desc:      'Pull live comps, run ARV calculations, and generate a full investment report — automatically.',
    accent:    '#22c55e',
    accentDim: 'rgba(34,197,94,0.08)',
    status:    'live' as const,
  },
  {
    icon:      Mic,
    name:      'Sales Coach',
    tagline:   'Every call, scored & coached',
    desc:      'Score transcripts against FUS/ACQ rubrics and surface actionable insights for your team.',
    accent:    '#0ea5e9',
    accentDim: 'rgba(14,165,233,0.08)',
    status:    'live' as const,
  },
  {
    icon:      FileText,
    name:      'AI Note Taker',
    tagline:   'Auto-notes from every call',
    desc:      'Capture, structure, and summarize key moments from sales calls without lifting a finger.',
    accent:    '#f59e0b',
    accentDim: 'rgba(245,158,11,0.08)',
    status:    'soon' as const,
  },
  {
    icon:      Database,
    name:      'Data Enrichment',
    tagline:   'Supercharge your lead data',
    desc:      'Enrich property leads with ownership history, market data, and AI-scored investment potential.',
    accent:    '#a855f7',
    accentDim: 'rgba(168,85,247,0.08)',
    status:    'soon' as const,
  },
]

const STATS = [
  { value: '1,200+', label: 'Deals underwritten' },
  { value: '18,000+', label: 'Calls scored' },
  { value: '40+', label: 'RE teams powered' },
]

const cardIn = {
  hidden: { opacity: 0, y: 14 },
  show:   (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.4 + i * 0.08, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export default function LoginForm() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)

  const router       = useRouter()
  const searchParams = useSearchParams()
  const next         = searchParams.get('next') ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push(next)
    router.refresh()
  }

  return (
    /* Lock to exactly one viewport height — no page scroll */
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        overflow: 'hidden',
        background: '#0d1b2e',
      }}
    >
      <ParticlesBg />

      {/* ═══════════════════════════════════════════════
          LEFT PANEL — marketing / product overview
      ═══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col"
        style={{
          width: '58%',
          height: '100%',
          padding: '28px 52px',
          zIndex: 10,
          justifyContent: 'space-between',
        }}
      >
        {/* Logo + eyebrow inline */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <Image src="/logo.png" alt="KPI DRIVER" width={90} height={32} style={{ objectFit: 'contain', flexShrink: 0 }} priority />
          <p style={{
            fontSize: 13, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: '#22c55e', margin: 0,
          }}>
            AI-powered real estate platform
          </p>
        </motion.div>

        {/* Hero + products (middle, vertically centred) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(24px,2.5vw,40px)',
            fontWeight: 700,
            lineHeight: 1.18,
            color: '#f1f5f9',
            marginBottom: 10,
          }}>
            Your complete AI stack<br />
            <span style={{
              background: 'linear-gradient(135deg,#22c55e 0%,#4ade80 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              for RE investors
            </span>
          </h1>

          {/* Description */}
          <p style={{
            fontSize: 13, fontWeight: 600, lineHeight: 1.7, color: '#64748b',
            maxWidth: 420, marginBottom: 16,
          }}>
            From underwriting deals to coaching your acquisitions team —
            every critical workflow automated with AI so you can focus on closing.
          </p>

          {/* Stats */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 0', marginBottom: 20, display: 'inline-flex', gap: 32, width: 'fit-content' }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', lineHeight: 1, marginBottom: 5 }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Product cards — 2×2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 520 }}>
            {PRODUCTS.map((p, i) => {
              const Icon = p.icon
              return (
                <motion.div
                  key={p.name}
                  custom={i}
                  variants={cardIn}
                  initial="hidden"
                  animate="show"
                  style={{
                    background: p.accentDim,
                    border:     `1px solid ${p.accent}22`,
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${p.accent}16`,
                      border: `1px solid ${p.accent}28`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} style={{ color: p.accent }} />
                    </div>
                    {p.status === 'live' ? (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 9, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 999,
                        background: 'rgba(34,197,94,0.10)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        Live
                      </span>
                    ) : (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 9, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 999,
                        background: 'rgba(251,146,60,0.12)',
                        color: '#fb923c',
                        border: '1px solid rgba(251,146,60,0.25)',
                      }}>
                        <Clock size={8} />
                        Soon
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: p.accent, marginBottom: 4 }}>
                    {p.tagline}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.6, color: '#94a3b8' }}>
                    {p.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

      </div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — login form
      ═══════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            width: '100%', maxWidth: 360,
            background:           'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            backdropFilter:       'blur(52px) saturate(180%) brightness(1.08)',
            WebkitBackdropFilter: 'blur(52px) saturate(180%) brightness(1.08)',
            border:               '1px solid rgba(255,255,255,0.18)',
            borderRadius:         24,
            padding:              '36px 32px',
            boxShadow:            'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 48px rgba(0,0,0,0.3)',
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
            Sign in
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>
            Welcome back — enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#334155', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="input-dark"
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#334155', pointerEvents: 'none' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-dark"
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 38, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 2, cursor: 'pointer',
                    color: '#475569', display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 12, fontSize: 12,
                background: 'rgba(239,68,68,0.08)',
                border:     '1px solid rgba(239,68,68,0.2)',
                color:      '#f87171',
              }}>
                <AlertCircle size={12} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '10px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 600, color: '#fff',
                background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)',
                border: 'none',
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 0 24px rgba(34,197,94,0.2)',
                marginTop: 4,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={14} /></>}
            </motion.button>
          </form>

        </motion.div>
      </div>

      {/* Copyright — centred across full page */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          textAlign: 'center', zIndex: 20,
          fontSize: 11, fontWeight: 600, color: '#475569',
        }}
      >
        2026 KPI DRIVER · Built for serious RE investors
      </motion.p>
    </div>
  )
}
