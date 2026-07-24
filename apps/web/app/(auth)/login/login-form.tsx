'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@kpidriver/auth/client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Mail, Lock, ArrowRight, AlertCircle,
  Eye, EyeOff,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import ParticlesBg from '@/components/ui/particles-bg'

const STATS = [
  { value: '5,000+',   label: 'Deals Underwritten'  },
  { value: '250,000+', label: 'Calls Scored'         },
  { value: '30+',      label: 'RE Teams Geared Up'   },
]

export default function LoginForm() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
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
          padding: '48px 60px',
          zIndex: 10,
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Logo + tagline — pinned top-left */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          style={{ position: 'absolute', top: 36, left: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
        >
          <Image src="/logo2.png" alt="KPI DRIVER" width={240} height={88} style={{ objectFit: 'contain' }} priority />
          <p style={{ fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            <span style={{ color: '#22c55e' }}>Built By </span>
            <span style={{ color: '#64748b' }}>RE Investors</span>
            <span style={{ color: '#22c55e' }}> For </span>
            <span style={{ color: '#64748b' }}>RE Investors</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
        >
          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(28px,2.8vw,46px)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#f1f5f9',
            marginBottom: 14,
            letterSpacing: '-0.02em',
          }}>
            Your Complete AI Stack<br />
            <span style={{
              background: 'linear-gradient(135deg,#22c55e 0%,#4ade80 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              For RE Investors
            </span>
          </h1>

          {/* Description */}
          <p style={{
            fontSize: 13, fontWeight: 500, lineHeight: 1.75, color: '#64748b',
            maxWidth: 440, marginBottom: 32,
          }}>
            Everything You Ever Dreamed of, Data Enrichment, Skiptracing, Transcription, Taking Notes, Filling CRM Fields, Coaching Insights on Live Calls, Training on All Situations, Underwriting. You Name it, We Have it DFY.
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 0,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 24,
            width: 'fit-content',
          }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                paddingRight: i < STATS.length - 1 ? 36 : 0,
                marginRight: i < STATS.length - 1 ? 36 : 0,
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
              </div>
            ))}
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
            Sign In
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>
            Enter Your Credentials & Start Your Engine
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                Email Address
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <Link
                  href="/auth/forgot-password"
                  style={{ fontSize: 11, fontWeight: 600, color: '#307DC0', textDecoration: 'none' }}
                >
                  Forgot Password?
                </Link>
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
              {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={14} /></>}
            </motion.button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Google button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                width: '100%', padding: '10px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 600, color: '#f1f5f9',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                opacity: (googleLoading || loading) ? 0.7 : 1,
                cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { if (!googleLoading && !loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.09)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)' }}
            >
              {/* Google G icon */}
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Redirecting…' : 'Sign In With Google'}
            </motion.button>
          </form>

        </motion.div>
      </div>

      {/* Footer — centred across full page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          zIndex: 20,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
          KPI DRIVER · Built By RE Investors For RE Investors
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#" style={{ fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            Terms & Conditions
          </a>
          <span style={{ color: '#2d3f52', fontSize: 11 }}>·</span>
          <a href="#" style={{ fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            Privacy Policy
          </a>
        </div>
      </motion.div>
    </div>
  )
}
