'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { requestPasswordReset } from '@/app/actions/auth/reset-password'
import ParticlesBg from '@/components/ui/particles-bg'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await requestPasswordReset(email)
    if (error) { setError(error); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', overflow: 'hidden', background: '#0d1b2e' }}>
      <ParticlesBg />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px 80px', zIndex: 10,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Logo */}
          <Image src="/logo3.png" alt="KPI DRIVER" width={210} height={77} style={{ objectFit: 'contain' }} priority />

          {/* Tagline */}
          <p style={{ fontSize: 11, fontWeight: 600, margin: '8px 0 28px', lineHeight: 1.5, textAlign: 'center' }}>
            <span style={{ color: '#22c55e' }}>Built By </span>
            <span style={{ color: '#64748b' }}>RE Investors</span>
            <span style={{ color: '#22c55e' }}> For </span>
            <span style={{ color: '#64748b' }}>RE Investors</span>
          </p>

          {/* Card */}
          <div style={{
            width: '100%',
            background:           'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
            backdropFilter:       'blur(52px) saturate(180%) brightness(1.08)',
            WebkitBackdropFilter: 'blur(52px) saturate(180%) brightness(1.08)',
            border:               '1px solid rgba(255,255,255,0.18)',
            borderRadius:         24,
            padding:              '36px 32px',
            boxShadow:            'inset 0 1px 0 rgba(255,255,255,0.2), 0 12px 48px rgba(0,0,0,0.3)',
          }}>
            {sent ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, #307DC0 0%, #43B749 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(67,183,73,0.3)',
                  }}>
                    <CheckCircle2 size={24} style={{ color: '#fff' }} />
                  </div>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
                  Check Your Email
                </h2>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
                  We Sent A Password Reset Link To <strong style={{ color: '#e2e8f0' }}>{email}</strong>. Click The Link In That Email To Set A New Password.
                </p>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, color: '#307DC0', textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={13} /> Back To Login
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, #307DC0 0%, #43B749 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(48,125,192,0.3)',
                  }}>
                    <Mail size={22} style={{ color: '#fff' }} />
                  </div>
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 4, textAlign: 'center' }}>
                  Forgot Password?
                </h2>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28, textAlign: 'center' }}>
                  Enter Your Email And We&apos;ll Send You A Reset Link.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#334155', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="input-dark"
                        style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 12, fontSize: 12,
                        background: 'rgba(237,31,36,0.08)',
                        border: '1px solid rgba(237,31,36,0.2)',
                        color: '#f87171',
                      }}
                    >
                      <AlertCircle size={12} style={{ flexShrink: 0 }} />
                      {error}
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '10px 0', borderRadius: 12, marginTop: 4,
                      fontSize: 13, fontWeight: 600, color: '#fff',
                      background: 'linear-gradient(135deg, #307DC0 0%, #43B749 100%)',
                      border: 'none',
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 0 24px rgba(48,125,192,0.25)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {loading
                      ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      : <><span>Send Reset Link</span><ArrowRight size={14} /></>
                    }
                  </motion.button>

                  <Link
                    href="/login"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none', marginTop: 4,
                    }}
                  >
                    <ArrowLeft size={12} /> Back To Login
                  </Link>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
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
          <a
            href="#"
            style={{ fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            Terms &amp; Conditions
          </a>
          <span style={{ color: '#2d3f52', fontSize: 11 }}>·</span>
          <a
            href="#"
            style={{ fontSize: 11, fontWeight: 600, color: '#475569', textDecoration: 'none' }}
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
