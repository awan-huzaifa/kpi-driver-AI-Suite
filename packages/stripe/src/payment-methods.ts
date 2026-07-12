import { getStripe } from './client'

export async function createSetupIntent(customerId: string) {
  const stripe = getStripe()
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })
}

export async function listPaymentMethods(customerId: string) {
  const stripe = getStripe()
  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
    stripe.customers.retrieve(customerId),
  ])

  const defaultPaymentMethodId =
    !customer.deleted && typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : null

  return { paymentMethods: methods.data, defaultPaymentMethodId }
}

export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  const stripe = getStripe()
  return stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

export async function detachPaymentMethod(paymentMethodId: string, customerId: string) {
  const stripe = getStripe()
  const method = await stripe.paymentMethods.retrieve(paymentMethodId)
  if (method.customer !== customerId) {
    throw new Error('payment_method_not_owned')
  }
  return stripe.paymentMethods.detach(paymentMethodId)
}
