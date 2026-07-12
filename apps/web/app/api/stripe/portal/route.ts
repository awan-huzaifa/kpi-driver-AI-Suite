import { NextResponse } from 'next/server'
import { createPortalSession } from '@kpidriver/stripe/subscription'

export async function POST(request: Request) {
  const { stripeCustomerId } = await request.json() as { stripeCustomerId: string }

  const session = await createPortalSession({
    customerId: stripeCustomerId,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
