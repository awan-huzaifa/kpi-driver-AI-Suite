import { getStripe } from './client'
import type Stripe from 'stripe'

export interface TopUpOption {
  priceId: string
  amount:  number   // dollars
  label:   string
}

export const TOP_UP_OPTIONS: TopUpOption[] = [
  { priceId: 'price_1To91RH6uSOX2qxGKNlBkAlM', amount: 25,   label: '$25' },
  { priceId: 'price_1To91RH6uSOX2qxGtPxvmtgm', amount: 50,   label: '$50' },
  { priceId: 'price_1To91RH6uSOX2qxGoF7yDbkx', amount: 100,  label: '$100' },
  { priceId: 'price_1To91RH6uSOX2qxGGlilF6JU', amount: 250,  label: '$250' },
  { priceId: 'price_1To91RH6uSOX2qxGnIoZky0K', amount: 500,  label: '$500' },
  { priceId: 'price_1To91RH6uSOX2qxGKGQ07HZq', amount: 1000, label: '$1,000' },
]

interface CreateTopUpSessionOptions {
  companyId:   string
  customerId:  string
  userEmail:   string
  priceId:     string
  successUrl:  string
  cancelUrl:   string
  description?: string
}

export async function createTopUpCheckoutSession({
  companyId,
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  description,
}: CreateTopUpSessionOptions) {
  const option = TOP_UP_OPTIONS.find((o) => o.priceId === priceId)
  if (!option) throw new Error(`Unknown top-up price: ${priceId}`)

  const stripe = getStripe()

  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: { companyId, amount: String(option.amount) },
    payment_intent_data: {
      metadata: { companyId },
      ...(description ? { description } : {}),
    },
  })
}

/**
 * Charge a saved card directly (off-session) without redirecting to Stripe Checkout.
 * Throws if the payment fails or requires additional authentication (3DS).
 */
export async function chargeWithSavedMethod(
  customerId: string,
  paymentMethodId: string,
  amountCents: number,
  companyId: string,
  description?: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe()

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { companyId },
    ...(description ? { description } : {}),
  })

  if (intent.status !== 'succeeded') {
    throw new Error(`Payment ${intent.status}`)
  }

  return intent
}
