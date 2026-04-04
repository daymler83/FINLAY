import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSession } from '@/lib/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '')

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 2000,
            product_data: {
              name: 'FINLAY Pro',
              description: 'Pago único: 500+ fármacos, comparador hasta 5, favoritos, historial y exportar nota clínica.',
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: session.userId,
      customer_email: session.email,
      success_url: `${baseUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pro`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear sesión de pago'
    console.error('Stripe error:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
