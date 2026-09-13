import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@kpidriver/auth/middleware'

// Routes that never require auth — these have their own auth (webhook secret / signature)
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/invite-callback',
  '/auth/set-password',
  '/auth/reset-password',
  '/auth/forgot-password',
  '/auth/no-access',
  '/auth/unlock-app',
  '/privacy_policy',
  '/terms-and-conditions',
  '/api/stripe/webhook',
  '/api/calls/ingest',
  '/api/training-coach/ingest',
  '/api/note-taker/ingest',
  '/api/data-enrichment/ingest',
  '/api/skip-tracing/ingest',
  '/api/kpi/ingest',
  '/api/email-reports/cron',
]

// Map URL path prefixes → per-user app flag column names
const APP_GATE = [
  { prefix: '/underwriting',   flag: 'app_underwriting'   },
  { prefix: '/sales-coach',    flag: 'app_sales_coach'    },
  { prefix: '/training-coach', flag: 'app_training_coach' },
  { prefix: '/note-taker',       flag: 'app_note_taker'       },
  { prefix: '/data-enrichment',  flag: 'app_data_enrichment'  },
  { prefix: '/skip-tracing',     flag: 'app_skip_tracing'     },
  { prefix: '/kpi-dashboard',   flag: 'app_kpi_dashboard',  minRole: 'admin' as const },
] as const

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Stripe webhook and auth routes skip all checks
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  // Refresh session and get user — required by @supabase/ssr
  const { response, user, supabase } = await updateSession(request)

  // Not logged in → login page
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check per-user app access flags
  const gated = APP_GATE.find(({ prefix }) => pathname.startsWith(prefix))
  if (gated) {
    const { data: userRow } = await supabase
      .from('users')
      .select('access_role, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing, app_kpi_dashboard')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = userRow?.access_role === 'super_admin'
    const isAdmin      = userRow?.access_role === 'admin'
    const flagMap: Record<string, boolean | undefined> = {
      app_underwriting:    userRow?.app_underwriting,
      app_sales_coach:     userRow?.app_sales_coach,
      app_training_coach:  userRow?.app_training_coach,
      app_note_taker:      userRow?.app_note_taker,
      app_data_enrichment: userRow?.app_data_enrichment,
      app_skip_tracing:    userRow?.app_skip_tracing,
      app_kpi_dashboard:   userRow?.app_kpi_dashboard,
    }
    const hasFlag = flagMap[gated.flag] === true
    const minRole = (gated as { minRole?: string }).minRole

    // super_admin always passes
    if (isSuperAdmin) { /* allow */ }
    // admin-only routes: admit admins unconditionally, block users
    else if (minRole === 'admin') {
      if (!isAdmin) return NextResponse.redirect(new URL('/dashboard?no_access=1', request.url))
    }
    // flag-gated routes: admin/user both need the flag
    else if (!hasFlag) {
      if (isAdmin) return NextResponse.redirect(new URL('/auth/unlock-app', request.url))
      return NextResponse.redirect(new URL('/dashboard?no_access=1', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
