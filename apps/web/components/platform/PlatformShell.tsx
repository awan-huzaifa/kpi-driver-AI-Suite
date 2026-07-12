'use client'

import { useMotionValue } from 'framer-motion'
import PageTransition from '@/components/ui/page-transition'
import DashboardBg from '@/components/ui/dashboard-bg'
import type { PlanId } from '@kpidriver/auth/types'
import { C } from './brand'
import { APP_REGISTRY, type Access } from './app-data'
import PlatformSidebar from './PlatformSidebar'

export type { Access }
export const APPS = APP_REGISTRY

/* ── Types ──────────────────────────────────────────────────────── */

interface Props {
  user:        { email: string; fullName: string | null }
  planId:      PlanId | null
  access:      Access
  accessRole?: 'admin' | 'super_admin' | 'user'
  pageTitle:   string
  children:    React.ReactNode
}

/* ── Main component ─────────────────────────────────────────────── */

export default function PlatformShell({ user, planId, access, accessRole, pageTitle, children }: Props) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.dark }}>

      <PlatformSidebar user={user} access={access} accessRole={accessRole} />

      {/* ═══════════════════════════════════════════
          MAIN AREA
      ═══════════════════════════════════════════ */}
      <div
        style={{ flex: 1, marginLeft: 248, display: 'flex', flexDirection: 'column', position: 'relative' }}
        onMouseMove={(e) => {
          const { left, top } = e.currentTarget.getBoundingClientRect()
          mouseX.set(e.clientX - left)
          mouseY.set(e.clientY - top)
        }}
      >
        <DashboardBg mouseX={mouseX} mouseY={mouseY} />

        {/* TOP BAR */}
        <header style={{
          display: 'flex', alignItems: 'center',
          padding: '0 36px', height: 56,
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(9,21,35,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 30, gap: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.dimText, letterSpacing: '0.06em', flex: 1 }}>
            KPI DRIVER / {pageTitle.toUpperCase()}
          </span>
          {planId && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 700, color: C.green,
              padding: '4px 12px', borderRadius: 999,
              border: '1px solid rgba(67,183,73,0.25)',
              background: 'rgba(67,183,73,0.08)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              {planId.charAt(0).toUpperCase() + planId.slice(1)} Plan
            </span>
          )}
        </header>

        {/* CONTENT */}
        <main style={{ padding: '48px 36px', maxWidth: 1100, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
