import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyStripeCustomer } from '@/lib/stripe/company-customer'
import { createTopUpCheckoutSession, chargeWithSavedMethod, TOP_UP_OPTIONS } from '@kpidriver/stripe/topup'
import { listPaymentMethods } from '@kpidriver/stripe/payment-methods'
import { getResend, BILLING_FROM_EMAIL } from '@/lib/email/client'
import { topupEmailTemplate } from '@/lib/email/templates'

async function sendBillingEmails(admin: ReturnType<typeof createAdminClient>, companyId: string, companyName: string, amount: number, newBalance: number, appUrl: string) {
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const { data: admins } = await admin
    .from('users')
    .select('id, notify_billing')
    .eq('company_id', companyId)
    .in('access_role', ['admin', 'super_admin'])
    .eq('is_active', true)
    .eq('notify_billing', true)

  if (!admins?.length) return

  const html = topupEmailTemplate(companyName, amount, newBalance, `${appUrl}/billing`)
  const resend = getResend()

  for (const u of admins) {
    const email = emailMap.get(u.id)
    if (!email) continue
    try {
      await resend.emails.send({
        from:    BILLING_FROM_EMAIL,
        to:      email,
        subject: `Wallet Top-Up — $${amount.toFixed(2)} added to ${companyName}`,
        html,
      })
    } catch (e) {
      console.error('[topup] billing email failed:', e)
    }
  }
}

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
        user.email!,
      )
      console.log('[topup] one-click charge succeeded — intent.id:', intent.id, 'description on intent:', intent.description)

      const { data: newBalance } = await admin.rpc('add_wallet_balance', {
        p_company_id:              companyId,
        p_amount_usd:              option.amount,
        p_description:             `Top-up $${option.amount}`,
        p_stripe_payment_intent:   intent.id,
      })

      void sendBillingEmails(admin, companyId, companyName, option.amount, newBalance ?? 0, appUrl)

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
