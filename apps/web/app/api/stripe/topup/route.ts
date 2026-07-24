import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyStripeCustomer } from '@/lib/stripe/company-customer'
import { createTopUpCheckoutSession, chargeWithSavedMethod, TOP_UP_OPTIONS } from '@kpidriver/stripe/topup'
import { listPaymentMethods } from '@kpidriver/stripe/payment-methods'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { priceId } = await request.json() as { priceId: string }
  if (!priceId) return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })

  const option = TOP_UP_OPTIONS.find((o) => o.priceId === priceId)
  if (!option) return NextResponse.json({ error: 'Unknown price' }, { status: 400 })

  const { customer, companyId } = await getCompanyStripeCustomer(user.id, user.email!)
  const { paymentMethods, defaultPaymentMethodId } = await listPaymentMethods(customer.id)

  const defaultPm = defaultPaymentMethodId
    ? paymentMethods.find((pm) => pm.id === defaultPaymentMethodId)
    : null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const admin  = createAdminClient()

  // Fetch company name for Stripe description
  const { data: companyRow } = await admin.from('companies').select('name').eq('id', companyId).single()
  const companyName = companyRow?.name ?? 'Unknown Company'
  const description = `Auto-Recharge for Sub-Account - ${companyName} of USD ${option.amount} was successfully added to the wallet. Please, check the billing page for more details: ${appUrl}/billing`

  console.log('[topup] companyId:', companyId)
  console.log('[topup] companyName:', companyName)
  console.log('[topup] description:', description)
  console.log('[topup] defaultPm:', defaultPm?.id ?? 'none (will use Checkout)')

  // ── One-click path: saved default card ──────────────────────────────────────
  if (defaultPm) {
    try {
      console.log('[topup] charging saved card off-session...')
      const intent = await chargeWithSavedMethod(
        customer.id,
        defaultPm.id,
        option.amount * 100,
        companyId,
        description,
      )
      console.log('[topup] one-click charge succeeded — intent.id:', intent.id, 'description on intent:', intent.description)

      const { data: newBalance } = await admin.rpc('add_wallet_balance', {
        p_company_id:              companyId,
        p_amount_usd:              option.amount,
        p_description:             `Top-up $${option.amount}`,
        p_stripe_payment_intent:   intent.id,
      })

      return NextResponse.json({ success: true, newBalance: newBalance ?? 0, amount: option.amount })
    } catch {
      // Card declined or requires 3DS — fall through to Stripe Checkout
    }
  }

  // ── Checkout fallback: no saved card or charge failed ───────────────────────
  console.log('[topup] falling back to Stripe Checkout...')
  const session = await createTopUpCheckoutSession({
    companyId,
    customerId:  customer.id,
    userEmail:   user.email!,
    priceId,
    successUrl:  `${appUrl}/billing?topup=success`,
    cancelUrl:   `${appUrl}/billing`,
    description,
  })
  console.log('[topup] checkout session created — id:', session.id, 'payment_intent_data.description set:', !!description)

  return NextResponse.json({ url: session.url })
}
