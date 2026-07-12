import { redirect } from 'next/navigation'
import { createClient } from '@kpidriver/auth/server'
import LoginForm from './login-form'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return <LoginForm />
}
