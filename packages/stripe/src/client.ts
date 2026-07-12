import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-05-28.basil',
      typescript: true,
    })
  }
  return _stripe
}

// Keep named export for backwards compat with any direct imports
export { getStripe as stripe }
