import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyStripeCustomer } from '@/lib/stripe/company-customer'
import { createSetupIntent } from '@kpidriver/stripe/payment-methods'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customer } = await getCompanyStripeCustomer(user.id, user.email!)
  const setupIntent  = await createSetupIntent(customer.id)

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
