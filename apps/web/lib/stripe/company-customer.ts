import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateCompanyCustomer } from '@kpidriver/stripe/subscription'
import type Stripe from 'stripe'

interface CompanyCustomer {
  customer:  Stripe.Customer
  companyId: string
}

/**
 * Resolves the Stripe customer for the company that owns the given user.
 * Creates the customer on Stripe and saves the ID back to companies if needed.
 * Uses the admin client to bypass RLS.
 */
export async function getCompanyStripeCustomer(userId: string, userEmail: string): Promise<CompanyCustomer> {
  const admin = createAdminClient()

  const { data: profile, error: profileErr } = await admin
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (profileErr || !profile?.company_id) {
    throw new Error('user_has_no_company')
  }

  const { data: company, error: companyErr } = await admin
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', profile.company_id)
    .single()

  if (companyErr) throw new Error('company_not_found')

  const { customer, created } = await getOrCreateCompanyCustomer(
    company?.stripe_customer_id ?? null,
    userEmail,
    profile.company_id,
  )

  if (created) {
    await admin
      .from('companies')
      .update({ stripe_customer_id: customer.id })
      .eq('id', profile.company_id)
  }

  return { customer, companyId: profile.company_id }
}
