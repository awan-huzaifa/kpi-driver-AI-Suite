import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@kpidriver/auth/middleware'

// Routes that never require auth — these have their own auth (webhook secret / signature)
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/auth/confirm',
  '/auth/invite-callback',
  '/auth/set-password',
  '/api/stripe/webhook',
  '/api/calls/ingest',
  '/api/training-coach/ingest',
  '/api/note-taker/ingest',
  '/api/data-enrichment/ingest',
  '/api/skip-tracing/ingest',
]

// Map URL path prefixes → per-user app flag column names
const APP_GATE = [
  { prefix: '/underwriting',   flag: 'app_underwriting'   },
  { prefix: '/sales-coach',    flag: 'app_sales_coach'    },
  { prefix: '/training-coach', flag: 'app_training_coach' },
  { prefix: '/note-taker',       flag: 'app_note_taker'       },
  { prefix: '/data-enrichment',  flag: 'app_data_enrichment'  },
  { prefix: '/skip-tracing',     flag: 'app_skip_tracing'     },
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
      .select('access_role, app_underwriting, app_sales_coach, app_training_coach, app_note_taker, app_data_enrichment, app_skip_tracing')
      .eq('id', user.id)
      .single()

    // Admins and super_admins always pass
    const isAdmin = userRow?.access_role === 'admin' || userRow?.access_role === 'super_admin'
    const flagMap: Record<string, boolean | undefined> = {
      app_underwriting:   userRow?.app_underwriting,
      app_sales_coach:    userRow?.app_sales_coach,
      app_training_coach: userRow?.app_training_coach,
      app_note_taker:      userRow?.app_note_taker,
      app_data_enrichment: userRow?.app_data_enrichment,
      app_skip_tracing:    userRow?.app_skip_tracing,
    }
    const hasFlag = flagMap[gated.flag] === true

    if (!isAdmin && !hasFlag) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
