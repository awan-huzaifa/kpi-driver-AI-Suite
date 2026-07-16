'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Users, CreditCard, Settings,
  ChevronDown, Lock, LogOut, ShieldCheck, SlidersHorizontal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { C } from './brand'
import { APP_REGISTRY, type Access, type AppEntry, type SubNavItem } from './app-data'

/* ── Types ──────────────────────────────────────────────────────── */

export interface PlatformSidebarProps {
  user:        { email: string; fullName: string | null }
  access:      Access
  accessRole?: 'admin' | 'super_admin' | 'user'
}

/* ── Bottom / workspace nav ─────────────────────────────────────── */

const BOTTOM_NAV = [
  { id: 'users',   label: 'Users',             href: '/admin/users', icon: Users    },
  { id: 'billing', label: 'Billing Dashboard', href: '/billing',     icon: CreditCard },
]

const SETTINGS_SUB = [
  { id: 'account', label: 'Account Settings', href: '/settings/account' },
  { id: 'company', label: 'Company Settings', href: '/settings/company' },
]

const UNLOCK_FORM_URL = 'https://link.kpidriver.com/widget/form/vUL1Mt66ystym8CfIXHM'

/* ── Sub-nav link ────────────────────────────────────────────────── */

function SubNavLink({ item, pathname }: { item: SubNavItem; pathname: string }) {
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
  const Icon   = item.icon

  return (
    <Link
      href={item.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px 6px 26px',
        borderRadius: 7, marginBottom: 1,
        textDecoration: 'none', position: 'relative',
        background: active ? 'rgba(48,125,192,0.1)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 14, borderRadius: 2, background: C.blue,
        }} />
      )}
      <Icon size={13} style={{ color: active ? C.blue : C.dimText, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: active ? 600 : 500, color: active ? C.white : C.mutedText }}>
        {item.label}
      </span>
    </Link>
  )
}

/* ── App nav item (with accordion) ──────────────────────────────── */

function AppNavItem({ app, unlocked, pathname, accessRole }: {
  app: AppEntry; unlocked: boolean; pathname: string; accessRole?: string
}) {
  const Icon      = app.icon
  const isActive  = app.href !== '#' && !app.href.startsWith('http') && pathname.startsWith(app.href)
  const isAdmin   = accessRole === 'admin' || accessRole === 'super_admin'
  const isSuperAdmin = accessRole === 'super_admin'

  const visibleSubNav = (app.subNav ?? []).filter((item) => {
    if (item.maxRole === 'admin' && isSuperAdmin) return false
    if (item.minRole === 'super_admin') return isSuperAdmin
    if (item.minRole === 'admin')       return isAdmin
    return true
  })

  const showSubNav = isActive && unlocked && visibleSubNav.length > 0

  return (
    <div>
      {/* App entry row */}
      <Link
        href={unlocked ? app.href : app.status === 'live' ? UNLOCK_FORM_URL : '#'}
        target={unlocked ? app.target : (!unlocked && app.status === 'live' ? '_blank' : undefined)}
        rel={(unlocked && app.target) || (!unlocked && app.status === 'live') ? 'noopener noreferrer' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 9, marginBottom: 2,
          textDecoration: 'none', position: 'relative',
          border: '1px solid transparent',
          opacity: unlocked ? 1 : 0.55,
          cursor: unlocked || app.status === 'live' ? 'pointer' : 'default',
        }}
      >
        {isActive && (
          <motion.div
            layoutId="platform-pill"
            style={{
              position: 'absolute', inset: 0, borderRadius: 9,
              background: 'linear-gradient(90deg, rgba(48,125,192,0.18) 0%, rgba(48,125,192,0.06) 100%)',
              border: '1px solid rgba(48,125,192,0.22)',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          />
        )}
        <Icon size={15} style={{ color: isActive ? C.blue : C.dimText, flexShrink: 0, position: 'relative', zIndex: 1 }} />
        <span style={{
          fontSize: 13, fontWeight: isActive ? 700 : 500,
          color: isActive ? C.white : C.mutedText,
          flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          position: 'relative', zIndex: 1,
        }}>
          {app.label}
        </span>
        {!unlocked
          ? <Lock size={11} style={{ color: C.dimText, flexShrink: 0, position: 'relative', zIndex: 1 }} />
          : isActive && visibleSubNav.length > 0
            ? <ChevronDown size={11} style={{ color: C.blue, flexShrink: 0, position: 'relative', zIndex: 1 }} />
            : <span style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? C.blue : C.green, flexShrink: 0, position: 'relative', zIndex: 1 }} />
        }
      </Link>

      {/* Sub-nav accordion */}
      <AnimatePresence initial={false}>
        {showSubNav && (
          <motion.div
            key="subnav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', marginBottom: 4 }}
          >
            {visibleSubNav.map((item) => (
              <SubNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Sidebar nav item (workspace / home) ────────────────────────── */

function NavLink({ href, icon: Icon, label, exact }: { href: string; icon: React.ElementType; label: string; exact?: boolean }) {
  const pathname = usePathname()
  const active   = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 10px', borderRadius: 9, marginBottom: 2,
        textDecoration: 'none', position: 'relative',
        border: '1px solid transparent',
      }}
    >
      {active && (
        <motion.div
          layoutId="platform-pill"
          style={{
            position: 'absolute', inset: 0, borderRadius: 9,
            background: 'linear-gradient(90deg, rgba(48,125,192,0.18) 0%, rgba(48,125,192,0.06) 100%)',
            border: '1px solid rgba(48,125,192,0.22)',
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <Icon size={15} style={{ color: active ? C.blue : C.dimText, flexShrink: 0, position: 'relative', zIndex: 1 }} />
      <span style={{
        fontSize: 13, fontWeight: active ? 700 : 500,
        color: active ? C.white : C.mutedText,
        flex: 1, position: 'relative', zIndex: 1,
      }}>
        {label}
      </span>
      {active && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue, flexShrink: 0, position: 'relative', zIndex: 1 }} />
      )}
    </Link>
  )
}

/* ── Main export ─────────────────────────────────────────────────── */

export default function PlatformSidebar({ user, access, accessRole }: PlatformSidebarProps) {
  const isAdmin      = accessRole === 'admin' || accessRole === 'super_admin'
  const isSuperAdmin = accessRole === 'super_admin'
  const pathname     = usePathname()
  const router       = useRouter()
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [companyLogoUrl,  setCompanyLogoUrl]  = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('kpi-company-logo') : null
  )
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('kpi-avatar-url') : null
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return
      supabase
        .from('users')
        .select('company_id, avatar_url')
        .eq('id', u.id)
        .single()
        .then(({ data: profile }) => {
          if ((profile as any)?.avatar_url) {
            setAvatarUrl((profile as any).avatar_url)
            localStorage.setItem('kpi-avatar-url', (profile as any).avatar_url)
          }
          if (!profile?.company_id) return
          supabase
            .from('companies')
            .select('logo_url')
            .eq('id', profile.company_id)
            .single()
            .then(({ data: co }) => {
              const url = (co as any)?.logo_url ?? null
              setCompanyLogoUrl(url)
              if (url) localStorage.setItem('kpi-company-logo', url)
              else localStorage.removeItem('kpi-company-logo')
            })
        })
    })

    function onAvatarUpdated(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      if (url) { setAvatarUrl(url); localStorage.setItem('kpi-avatar-url', url) }
    }
    window.addEventListener('avatar-updated', onAvatarUpdated)
    return () => window.removeEventListener('avatar-updated', onAvatarUpdated)
  }, [])

  const display  = user.fullName ?? user.email.split('@')[0]
  const initials = display[0]?.toUpperCase() ?? 'U'

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const sortedApps = [...APP_REGISTRY].sort((a: AppEntry, b: AppEntry) => {
    const aU = a.accessKey ? access[a.accessKey] : true
    const bU = b.accessKey ? access[b.accessKey] : true
    return Number(bU) - Number(aU)
  })

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 248,
      background: `linear-gradient(180deg, rgba(252,175,23,0.05) 0%, ${C.sidebar} 14%, ${C.sidebar} 82%, rgba(67,183,73,0.06) 100%)`,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      zIndex: 40, overflowY: 'auto',
    }}>

      {/* Logo */}
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, flexShrink: 0,
      }}>
        {companyLogoUrl ? (
          <img
            src={companyLogoUrl}
            alt="Company logo"
            style={{ maxWidth: 160, maxHeight: 44, objectFit: 'contain' }}
          />
        ) : (
          <>
            <Image src="/logo.png" alt="KPI DRIVER" width={80} height={36} style={{ objectFit: 'contain' }} priority />
            <p style={{ fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
              <span style={{ color: C.green }}>Built By </span>
              <span style={{ color: C.dimText }}>RE Investors</span>
              <span style={{ color: C.green }}>, For </span>
              <span style={{ color: C.dimText }}>RE Investors</span>
            </p>
          </>
        )}
      </div>

      {/* Home */}
      <div style={{ padding: '10px 10px 4px', flexShrink: 0 }}>
        <NavLink href="/dashboard" icon={Home} label="Home" exact />
      </div>

      {/* Apps */}
      <div style={{ padding: '4px 10px', flexShrink: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: C.blue, textTransform: 'uppercase',
          padding: '0 8px', marginBottom: 4,
        }}>Apps</p>

        {sortedApps.map((app) => {
          const unlocked = app.accessKey ? access[app.accessKey] : true
          return (
            <AppNavItem
              key={app.id}
              app={app}
              unlocked={unlocked}
              pathname={pathname}
              accessRole={accessRole}
            />
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Super Admin */}
      {isSuperAdmin && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 10px 6px', flexShrink: 0 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: C.blue, textTransform: 'uppercase',
            padding: '0 8px', marginBottom: 4,
          }}>Super Admin</p>
          <NavLink href="/super-admin/companies"      icon={ShieldCheck}       label="Companies"      />
          <NavLink href="/super-admin/billing-config" icon={SlidersHorizontal} label="Billing Config" />
        </div>
      )}

      {/* Workspace */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 10px 6px', flexShrink: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: C.dimText, textTransform: 'uppercase',
          padding: '0 8px', marginBottom: 4,
        }}>Workspace</p>

        {/* Settings accordion */}
        <div>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 8px', borderRadius: 6,
              background: settingsOpen ? C.activeBg : 'transparent',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Settings size={15} style={{ flexShrink: 0, color: settingsOpen ? C.blue : C.dimText }} />
            <span style={{ fontSize: 13, fontWeight: settingsOpen ? 600 : 500, flex: 1, textAlign: 'left', color: settingsOpen ? C.white : C.mutedText }}>
              Settings
            </span>
            <ChevronDown size={12} style={{
              color: C.dimText, flexShrink: 0,
              transform: settingsOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }} />
          </button>

          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden' }}
              >
                {SETTINGS_SUB.filter((s) => s.id !== 'company' || isAdmin).map((s) => (
                  <Link
                    key={s.id} href={s.href}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '6px 8px 6px 32px',
                      fontSize: 12, fontWeight: 500, color: C.mutedText,
                      textDecoration: 'none', borderRadius: 6,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.white)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.mutedText)}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.blue, marginRight: 8, flexShrink: 0 }} />
                    {s.label}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {BOTTOM_NAV.filter((item) => {
          if (item.id === 'users')   return isAdmin
          if (item.id === 'billing') return isAdmin && !isSuperAdmin
          return true
        }).map((item) => (
          <NavLink key={item.id} href={item.href} icon={item.icon} label={item.label} exact />
        ))}
      </div>

      {/* User card */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: 'rgba(48,125,192,0.15)', border: '1px solid rgba(48,125,192,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.blue, fontSize: 13, fontWeight: 800,
          overflow: 'hidden',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.white, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {display}
            </p>
            {accessRole && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 99, flexShrink: 0,
                ...(accessRole === 'super_admin'
                  ? { color: '#FCAF17', background: 'rgba(252,175,23,0.12)', border: '1px solid rgba(252,175,23,0.25)' }
                  : accessRole === 'admin'
                  ? { color: C.blue,    background: 'rgba(48,125,192,0.12)',  border: '1px solid rgba(48,125,192,0.25)'  }
                  : { color: C.dimText, background: 'rgba(139,156,176,0.08)', border: '1px solid rgba(139,156,176,0.15)' }),
              }}>
                {accessRole === 'super_admin' ? 'Super Admin' : accessRole === 'admin' ? 'Admin' : 'User'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, fontWeight: 500, color: C.dimText, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </p>
        </div>
        <button
          onClick={signOut} title="Sign out"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.dimText, flexShrink: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.red)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.dimText)}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
