'use server'

import { createClient } from '@kpidriver/auth/server'

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kpidriver.ai'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/auth/confirm`,
  })

  if (error) return { error: error.message }
  return {}
}
