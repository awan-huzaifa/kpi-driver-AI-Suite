import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompanyStripeCustomer } from '@/lib/stripe/company-customer'
import { detachPaymentMethod } from '@kpidriver/stripe/payment-methods'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentMethodId } = await request.json() as { paymentMethodId: string }
  if (!paymentMethodId) return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 })

  const { customer } = await getCompanyStripeCustomer(user.id, user.email!)

  try {
    await detachPaymentMethod(paymentMethodId, customer.id)
  } catch (err) {
    if (err instanceof Error && err.message === 'payment_method_not_owned') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
