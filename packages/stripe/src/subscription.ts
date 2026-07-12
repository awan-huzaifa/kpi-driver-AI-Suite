import { getStripe } from './client'
import { PLANS } from './plans'
import type { PlanId } from '@kpidriver/auth/types'

interface CreateCheckoutOptions {
  userId: string
  userEmail: string
  planId: PlanId
  successUrl: string
  cancelUrl: string
  existingCustomerId?: string | null
}

export async function createCheckoutSession({
  userId,
  userEmail,
  planId,
  successUrl,
  cancelUrl,
  existingCustomerId,
}: CreateCheckoutOptions) {
  const stripe = getStripe()
  const plan = PLANS[planId]

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : userEmail,
    line_items: [{ price: plan.priceId(), quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    subscription_data: {
      metadata: { userId, planId },
    },
  })
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

export async function getOrCreateCustomer(userId: string, email: string) {
  const stripe = getStripe()
  const existing = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) return existing.data[0]!

  return stripe.customers.create({
    email,
    metadata: { userId },
  })
}

/** Get or create a Stripe customer scoped to a company (not a user). */
export async function getOrCreateCompanyCustomer(
  existingCustomerId: string | null,
  companyEmail: string,
  companyId: string,
): Promise<{ customer: import('stripe').default.Customer; created: boolean }> {
  const stripe = getStripe()

  if (existingCustomerId) {
    try {
      const c = await stripe.customers.retrieve(existingCustomerId)
      if (!c.deleted) return { customer: c as import('stripe').default.Customer, created: false }
    } catch {
      // Customer no longer exists in Stripe — create a fresh one below
    }
  }

  const customer = await stripe.customers.create({
    email: companyEmail,
    metadata: { companyId },
  })
  return { customer, created: true }
}
