import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Webhook de Stripe deshabilitado. Usa Mercado Pago.' },
    { status: 410 }
  )
}
