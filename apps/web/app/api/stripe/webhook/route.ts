import { NextResponse } from 'next/server'
import { constructWebhookEvent } from '@kpidriver/stripe/webhook'
import { createServiceClient } from '@kpidriver/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, BILLING_FROM_EMAIL } from '@/lib/email/client'
import { topupEmailTemplate } from '@/lib/email/templates'
import type Stripe from 'stripe'

async function sendBillingEmails(admin: ReturnType<typeof createAdminClient>, companyId: string, amount: number, newBalance: number) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: companyRow } = await admin.from('companies').select('name').eq('id', companyId).single()
  const companyName = companyRow?.name ?? 'Your Company'

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

  const html   = topupEmailTemplate(companyName, amount, newBalance, `${appUrl}/billing`)
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
      console.error('[webhook] billing email failed:', e)
    }
  }
}

export async function POST(request: Request) {
  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const admin    = createAdminClient()

  switch (event.type) {

    // ── One-time top-up via Stripe Checkout ────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment') {
        // Subscription checkout (legacy) — keep existing logic
        if (session.mode !== 'subscription') break

        const userId        = session.metadata?.userId
        const planId        = session.metadata?.planId
        const subscriptionId = session.subscription as string
        const customerId    = session.customer as string

        if (!userId || !planId) break

        await supabase.from('subscriptions').upsert({
          user_id:                userId,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          plan_id:                planId,
          status:                 'active',
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }

      // Payment mode = top-up via Checkout (fallback when no saved card)
      const companyId       = session.metadata?.companyId
      const amountDollars   = (session.amount_total ?? 0) / 100
      const paymentIntentId = session.payment_intent as string | null

      if (!companyId || !amountDollars) break

      const { data: newBalance } = await admin.rpc('add_wallet_balance', {
        p_company_id:             companyId,
        p_amount_usd:             amountDollars,
        p_description:            `Top-up $${amountDollars}`,
        p_stripe_payment_intent:  paymentIntentId,
      })

      void sendBillingEmails(admin, companyId, amountDollars, newBalance ?? 0)
      break
    }

    // ── One-click direct charge succeeded ────────────────────────────────────
    // NOTE: the one-click path in /api/stripe/topup already calls add_wallet_balance
    // synchronously AND sends billing emails. This handler is a safety net for edge
    // cases (network failure between charge and our DB write). The RPC is idempotent
    // on payment_intent_id. We do NOT re-send the billing email here to avoid duplicates.
    case 'payment_intent.succeeded': {
      const intent    = event.data.object as Stripe.PaymentIntent
      const companyId = intent.metadata?.companyId
      if (!companyId || !intent.amount) break

      const amountDollars = intent.amount / 100
      await admin.rpc('add_wallet_balance', {
        p_company_id:             companyId,
        p_amount_usd:             amountDollars,
        p_description:            `Top-up $${amountDollars}`,
        p_stripe_payment_intent:  intent.id,
      })
      break
    }

    case 'payment_intent.payment_failed': {
      // Nothing to do — the charge never succeeded, no balance was credited.
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      const planId = sub.metadata?.planId

      if (!userId) break

      await supabase.from('subscriptions').upsert({
        user_id:                userId,
        stripe_customer_id:     sub.customer as string,
        stripe_subscription_id: sub.id,
        plan_id:                planId ?? null,
        status:                 sub.status,
        current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        updated_at:             new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
