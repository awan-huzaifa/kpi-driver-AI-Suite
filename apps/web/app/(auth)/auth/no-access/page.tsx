import Link from 'next/link'
import { createClient } from '@kpidriver/auth/server'
import { redirect } from 'next/navigation'

export default async function NoAccessPage() {
  // Sign them out immediately so they don't linger as an authenticated-but-blocked user
  const supabase = await createClient()
  await supabase.auth.signOut()

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d1b2e', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: '40px 32px',
      }}>
        {/* Lock icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: 'rgba(237,31,36,0.1)', border: '1px solid rgba(237,31,36,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ED1F24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>
          Access Not Granted
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
          Your Google Account Isn&apos;t Linked To A KPI DRIVER Invite.<br />
          Contact Your Admin To Get Access.
        </p>

        <Link
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 12,
            background: 'rgba(48,125,192,0.15)', border: '1px solid rgba(48,125,192,0.3)',
            color: '#307DC0', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
