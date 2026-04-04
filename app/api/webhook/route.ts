import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { activateProUser } from '@/lib/payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    console.error('Webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    if (!userId) {
      return NextResponse.json({ error: 'No userId' }, { status: 400 })
    }

    await activateProUser(userId, 'stripe', session.customer as string | undefined)
  }

  return NextResponse.json({ received: true })
}
