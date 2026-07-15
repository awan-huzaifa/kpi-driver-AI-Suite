'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Mic, Building2, GraduationCap,
  Lock, ArrowRight, Zap, Wallet, TrendingUp,
} from 'lucide-react'
import type { PlanId } from '@kpidriver/auth/types'
import PlatformShell, { type Access } from '@/components/platform/PlatformShell'
import { APP_REGISTRY, type AppEntry } from '@/components/platform/app-data'
import { C } from '@/components/platform/brand'

const UNLOCK_FORM_URL = 'https://link.kpidriver.com/widget/form/vUL1Mt66ystym8CfIXHM'

/* ── Animated counter ───────────────────────────────────────────── */

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const startTime = performance.now()
    function step(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
      else setCount(target)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return count
}

/* ── App data (from shared registry) ───────────────────────────── */

const APPS = APP_REGISTRY

/* ── Animation variants ─────────────────────────────────────────── */

const fadeUp = {
  hidden:  { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

/* ── Types ──────────────────────────────────────────────────────── */

interface Stats {
  liveCalls:     number
  deals:         number
  training:      number
  walletBalance: number | null
}

interface Props {
  user:       { email: string; fullName: string | null }
  planId:     PlanId | null
  access:     Access
  accessRole: 'admin' | 'super_admin' | 'user'
  stats:      Stats
}

/* ── Stat card ──────────────────────────────────────────────────── */

function StatCard({ label, sublabel, value, icon: Icon, color, accentRgb, href, index }: {
  label: string; sublabel: string; value: number | string; icon: React.ElementType
  color: string; accentRgb: string; href: string; index: number
}) {
  const numericValue = typeof value === 'number' ? value : null
  const counted      = useCountUp(numericValue ?? 0)
  const display      = numericValue !== null ? counted : value

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible">
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        <motion.div
          whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(${accentRgb},0.15)` }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(${accentRgb},0.18)`,
            borderRadius: 16,
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, rgba(${accentRgb},0.8) 0%, rgba(${accentRgb},0.1) 100%)`,
          }} />

          {/* Glow orb */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: `rgba(${accentRgb},0.06)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `rgba(${accentRgb},0.12)`,
              border: `1px solid rgba(${accentRgb},0.25)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={17} style={{ color }} />
            </div>
            <TrendingUp size={13} style={{ color: `rgba(${accentRgb},0.4)`, marginTop: 4 }} />
          </div>

          <p style={{ fontSize: 32, fontWeight: 900, color: C.white, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {display}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.bodyText, margin: '6px 0 2px' }}>
            {label}
          </p>
          <p style={{ fontSize: 11, color: C.dimText, margin: 0, fontWeight: 500 }}>
            {sublabel}
          </p>
        </motion.div>
      </Link>
    </motion.div>
  )
}

/* ── Tool card ──────────────────────────────────────────────────── */

function ToolCard({ app, unlocked, index }: { app: AppEntry; unlocked: boolean; index: number }) {
  const Icon = app.icon
  const rgb  = unlocked ? app.accentRgb : '74,96,128'

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      whileHover={unlocked ? { y: -4, scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(${rgb},0.15)`,
        borderRadius: 18,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        opacity: unlocked ? 1 : 0.5,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
        onMouseEnter={(e) => {
          if (!unlocked) return
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = `rgba(${rgb},0.4)`
          el.style.boxShadow   = `0 16px 48px rgba(${rgb},0.1), inset 0 1px 0 rgba(255,255,255,0.06)`
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = `rgba(${rgb},0.15)`
          el.style.boxShadow   = 'none'
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 140, height: 140, borderRadius: '50%',
          background: `rgba(${rgb},0.05)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13,
            background: `linear-gradient(135deg, rgba(${rgb},0.2) 0%, rgba(${rgb},0.08) 100%)`,
            border: `1px solid rgba(${rgb},0.25)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px rgba(${rgb},0.15)`,
          }}>
            <Icon size={21} style={{ color: `rgb(${rgb})` }} />
          </div>

          {app.status === 'live' ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(67,183,73,0.1)',
              border: '1px solid rgba(67,183,73,0.25)',
              color: C.green,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: C.green,
                display: 'inline-block',
                boxShadow: `0 0 6px ${C.green}`,
              }} />
              LIVE
            </span>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(252,175,23,0.08)',
              border: '1px solid rgba(252,175,23,0.2)',
              color: C.yellow,
            }}>
              COMING SOON
            </span>
          )}
        </div>

        {/* Name + tagline */}
        <h3 style={{ fontSize: 17, fontWeight: 800, color: unlocked ? C.white : C.mutedText, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          {app.label}
        </h3>
        <p style={{ fontSize: 12, fontWeight: 700, color: `rgb(${rgb})`, margin: '0 0 12px', letterSpacing: '0.01em' }}>
          {app.tagline}
        </p>

        {/* Desc + features */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.bodyText, lineHeight: 1.7, margin: '0 0 16px', flex: 1 }}>
            {app.desc}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {app.features.map((f) => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: `rgb(${rgb})`, flexShrink: 0,
                  boxShadow: unlocked ? `0 0 4px rgba(${rgb},0.6)` : 'none',
                }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: unlocked ? C.bodyText : C.dimText }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div style={{
          height: 1, margin: '0 0 16px',
          background: `linear-gradient(90deg, rgba(${rgb},0.2) 0%, transparent 100%)`,
        }} />

        {/* CTA */}
        {unlocked ? (
          <Link href={app.href} target={app.target} rel={app.target ? 'noopener noreferrer' : undefined} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, fontWeight: 700, color: C.blue,
            textDecoration: 'none',
          }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = C.white
              const arrow = el.querySelector('.arrow') as HTMLElement
              if (arrow) arrow.style.transform = 'translateX(4px)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.color = C.blue
              const arrow = el.querySelector('.arrow') as HTMLElement
              if (arrow) arrow.style.transform = 'translateX(0)'
            }}
          >
            <span>Open {app.label}</span>
            <ArrowRight className="arrow" size={15} style={{ transition: 'transform 0.18s' }} />
          </Link>
        ) : (
          app.status === 'live' ? (
            <a
              href={UNLOCK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: C.blue, textDecoration: 'none' }}
            >
              <Lock size={13} />
              Request Access
            </a>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: C.dimText }}>
              <Lock size={13} />
              Coming Soon
            </div>
          )
        )}
      </div>
    </motion.div>
  )
}

/* ── Main component ─────────────────────────────────────────────── */

export default function DashboardClient({ user, planId, access, accessRole, stats }: Props) {
  const display = user.fullName ?? user.email.split('@')[0]

  const sortedApps = [...APPS].sort((a: AppEntry, b: AppEntry) => {
    const aU = a.accessKey ? access[a.accessKey] : true
    const bU = b.accessKey ? access[b.accessKey] : true
    return Number(bU) - Number(aU)
  })

  const monthLabel = new Date().toLocaleString('default', { month: 'long' })

  const statCards = [
    { label: 'Live Calls Scored',  sublabel: `This ${monthLabel}`, value: stats.liveCalls, icon: Mic,          color: C.blue,  accentRgb: '48,125,192', href: '/sales-coach/live-calls' },
    { label: 'Deals Underwritten', sublabel: `This ${monthLabel}`, value: stats.deals,     icon: Building2,     color: C.green, accentRgb: '67,183,73',  href: '/underwriting'          },
    { label: 'Training Sessions',  sublabel: `This ${monthLabel}`, value: stats.training,  icon: GraduationCap, color: C.yellow, accentRgb: '252,175,23', href: '/training-coach'        },
    ...(stats.walletBalance !== null ? [{
      label: 'Wallet Balance', sublabel: 'Available balance',
      value: `$${stats.walletBalance.toFixed(2)}`,
      icon: Wallet,
      color:      stats.walletBalance > 5 ? C.green : C.red,
      accentRgb:  stats.walletBalance > 5 ? '67,183,73' : '237,31,36',
      href: '/billing',
    }] : []),
  ]

  return (
    <PlatformShell planId={planId} pageTitle="Home">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ marginBottom: 36 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 7,
            background: 'rgba(67,183,73,0.15)', border: '1px solid rgba(67,183,73,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={12} style={{ color: C.green }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.green, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Welcome back
          </p>
        </div>

        <h1 style={{
          fontSize: 48, fontWeight: 900,
          letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 12,
          background: `linear-gradient(135deg, ${C.white} 40%, rgba(67,183,73,0.75) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {display}
        </h1>

        <p style={{ fontSize: 15, fontWeight: 500, color: C.bodyText, margin: 0, maxWidth: 480 }}>
          {planId
            ? `You're on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan — your tools are ready below.`
            : "Here's Your Team's Activity At A Glance."}
        </p>
      </motion.div>

      {/* ── Stat cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${statCards.length}, 1fr)`,
        gap: 16, marginBottom: 48,
      }}>
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      {/* ── Apps section header ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: C.yellow, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Your Workspace
        </p>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(252,175,23,0.3) 0%, rgba(67,183,73,0.15) 50%, transparent 100%)' }} />
        <span style={{ fontSize: 11, color: C.dimText, fontWeight: 500 }}>
          {APPS.filter(a => a.accessKey && access[a.accessKey]).length} of {APPS.filter(a => a.status === 'live').length} apps active
        </span>
      </motion.div>

      {/* ── App cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 18,
      }}>
        {sortedApps.map((app, i) => {
          const unlocked = app.accessKey ? access[app.accessKey] : true
          return <ToolCard key={app.id} app={app} unlocked={unlocked} index={i} />
        })}
      </div>

      {/* ── Low balance banner ── */}
      {stats.walletBalance !== null && stats.walletBalance <= 5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{
            marginTop: 28, padding: '16px 24px', borderRadius: 14,
            background: 'rgba(237,31,36,0.06)',
            border: '1px solid rgba(237,31,36,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: C.red }}>
            Wallet balance is low — top up to keep your tools running.
          </span>
          <Link href="/billing" style={{
            fontSize: 13, fontWeight: 700, color: C.white, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(237,31,36,0.15)', border: '1px solid rgba(237,31,36,0.3)',
            padding: '6px 14px', borderRadius: 8,
          }}>
            Top up <ArrowRight size={13} />
          </Link>
        </motion.div>
      )}
    </PlatformShell>
  )
}
