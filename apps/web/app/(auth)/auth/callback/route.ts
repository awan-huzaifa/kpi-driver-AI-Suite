import { NextResponse } from 'next/server'
import { createClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const tokenHash  = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // PKCE flow (newer Supabase default — also used by Google OAuth)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    // Banned users get rejected by Supabase at exchange time
    if (error) {
      return NextResponse.redirect(`${origin}/auth/no-access?reason=deactivated`)
    }

    if (data.user) {
      // Use admin client to bypass RLS and get the actual users row
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('users')
        .select('id, company_id, access_role, is_active')
        .eq('id', data.user.id)
        .maybeSingle()

      // Deactivated user — sign out and redirect to error screen
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/auth/no-access?reason=deactivated`)
      }

      // A properly invited user always has a company_id OR is super_admin.
      // The DB trigger auto-creates a users row for any new auth user (including
      // uninvited Google sign-ins) with company_id=null and access_role='user',
      // so we must check more than just row existence.
      const isProperlyInvited =
        profile &&
        (profile.access_role === 'super_admin' || profile.company_id !== null)

      if (!isProperlyInvited) {
        // Clear the session and delete the orphan auth user created by the trigger
        await supabase.auth.signOut()
        await admin.auth.admin.deleteUser(data.user.id)
        return NextResponse.redirect(`${origin}/auth/no-access`)
      }
      void admin.from('users').update({ last_signin_consent_at: new Date().toISOString() }).eq('id', data.user.id)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // OTP / token_hash flow (legacy or non-PKCE)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      const redirect = type === 'invite' ? '/auth/set-password' : next
      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
