import { NextResponse } from 'next/server'
import { createCheckoutSession } from '@kpidriver/stripe/subscription'
import type { PlanId } from '@kpidriver/auth/types'

export async function POST(request: Request) {
  const { planId, userId, userEmail, stripeCustomerId } = await request.json() as {
    planId: PlanId
    userId: string
    userEmail: string
    stripeCustomerId: string | null
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const session = await createCheckoutSession({
    userId,
    userEmail,
    planId,
    successUrl: `${appUrl}/dashboard?checkout=success`,
    cancelUrl: `${appUrl}/billing`,
    existingCustomerId: stripeCustomerId,
  })

  return NextResponse.json({ url: session.url })
}
