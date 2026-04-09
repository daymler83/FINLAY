import { NextRequest, NextResponse } from 'next/server'
import { fetchMercadoPagoPayment, fetchMercadoPagoSubscription, shouldEnforceMercadoPagoWebhookSignature, validateMercadoPagoWebhookSignature } from '@/lib/mercadoPago'
import {
  syncUserFromMercadoPagoSubscription,
} from '@/lib/proSubscription'

type MercadoPagoWebhookBody = {
  type?: string
  topic?: string
  action?: string
  data?: {
    id?: string | number
  }
}

export async function GET() {
  return NextResponse.json({ received: true })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text()
  let payload: MercadoPagoWebhookBody | null = null

  try {
    payload = bodyText ? JSON.parse(bodyText) as MercadoPagoWebhookBody : null
  } catch {
    payload = null
  }

  const notificationType = payload?.type ?? payload?.topic ?? request.nextUrl.searchParams.get('type')
  if (notificationType && !['payment', 'preapproval'].includes(notificationType)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const resourceId =
    payload?.data?.id ??
    request.nextUrl.searchParams.get('data.id') ??
    request.nextUrl.searchParams.get('data.id_url') ??
    request.nextUrl.searchParams.get('id')

  if (!resourceId) {
    return NextResponse.json({ error: 'resourceId no recibido' }, { status: 400 })
  }

  const signatureValid = validateMercadoPagoWebhookSignature({ request, dataId: resourceId })
  if (!signatureValid && shouldEnforceMercadoPagoWebhookSignature()) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  if (!signatureValid) {
    console.warn('Mercado Pago webhook signature skipped for test mode')
  }

  try {
    if (notificationType === 'preapproval') {
      const subscription = await fetchMercadoPagoSubscription(String(resourceId))
      if (!subscription.external_reference) {
        return NextResponse.json({ received: true, ignored: true })
      }

      await syncUserFromMercadoPagoSubscription({
        userId: String(subscription.external_reference),
        subscription,
      })
      return NextResponse.json({ received: true })
    }

    const payment = await fetchMercadoPagoPayment(resourceId)
    if (payment.status !== 'approved') {
      return NextResponse.json({ received: true, ignored: true })
    }

    const subscriptionId = (payment as { subscription_id?: string }).subscription_id
    if (subscriptionId) {
      const subscription = await fetchMercadoPagoSubscription(subscriptionId)
      if (subscription.external_reference) {
        await syncUserFromMercadoPagoSubscription({
          userId: String(subscription.external_reference),
          subscription,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de Mercado Pago'
    console.error('Mercado Pago webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
