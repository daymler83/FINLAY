import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createMercadoPagoSubscription } from '@/lib/mercadoPago'
import { PRO_PLANS, resolveProPlanKey } from '@/lib/proAccess'
import { storePendingProSubscription } from '@/lib/proSubscription'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const body = await request.json().catch(() => null)
  const requestedPlan = body?.plan
  const planKey = requestedPlan ? resolveProPlanKey(requestedPlan) : 'monthly'

  if (!planKey) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }

  try {
    const subscription = await createMercadoPagoSubscription({
      userId: session.userId,
      email: session.email,
      baseUrl,
      planKey,
    })

    if (!subscription.init_point || !subscription.id) {
      return NextResponse.json({ error: 'No se pudo generar la suscripción de Mercado Pago' }, { status: 500 })
    }

    await storePendingProSubscription({
      userId: session.userId,
      subscriptionId: subscription.id,
      planKey,
    })

    return NextResponse.json({
      url: subscription.init_point,
      subscriptionId: subscription.id,
      plan: planKey,
      planDetails: PRO_PLANS[planKey],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear preferencia de Mercado Pago'
    const details = error && typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : ''
    console.error('Mercado Pago checkout error:', message, details)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
