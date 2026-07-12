import type { User, Session } from '@supabase/supabase-js'

export type { User, Session }

export type AuthUser = User

export type AppId = 'underwriting' | 'sales-coach'

export type PlanId = 'starter' | 'pro'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_id: PlanId | null
  status: SubscriptionStatus | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}
