import type { AppId, PlanId } from '@kpidriver/auth/types'

export interface Plan {
  id: PlanId
  name: string
  description: string
  priceId: () => string
  apps: AppId[]
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Access to the AI Underwriting tool',
    priceId: () => process.env.STRIPE_STARTER_PRICE_ID!,
    apps: ['underwriting'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Access to all tools: Underwriting + Sales Coach',
    priceId: () => process.env.STRIPE_PRO_PRICE_ID!,
    apps: ['underwriting', 'sales-coach'],
  },
}

export function canAccessApp(planId: PlanId | null | undefined, app: AppId): boolean {
  if (!planId) return false
  return PLANS[planId]?.apps.includes(app) ?? false
}

export function getPlanForApp(app: AppId): Plan[] {
  return Object.values(PLANS).filter((p) => p.apps.includes(app))
}
