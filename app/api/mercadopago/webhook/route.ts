import { NextRequest, NextResponse } from 'next/server'
import { activateProUser } from '@/lib/payments'
import {
  fetchMercadoPagoPayment,
  validateMercadoPagoWebhookSignature,
} from '@/lib/mercadoPago'

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
  if (notificationType && notificationType !== 'payment') {
    return NextResponse.json({ received: true, ignored: true })
  }

  const paymentId =
    payload?.data?.id ??
    request.nextUrl.searchParams.get('data.id') ??
    request.nextUrl.searchParams.get('data.id_url') ??
    request.nextUrl.searchParams.get('id')

  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId no recibido' }, { status: 400 })
  }

  if (!validateMercadoPagoWebhookSignature({ request, dataId: paymentId })) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  try {
    const payment = await fetchMercadoPagoPayment(paymentId)

    if (payment.status !== 'approved' || !payment.external_reference) {
      return NextResponse.json({ received: true, ignored: true })
    }

    await activateProUser(payment.external_reference, 'mercadopago')

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error procesando webhook de Mercado Pago'
    console.error('Mercado Pago webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
