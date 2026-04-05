import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe está deshabilitado. Usa Mercado Pago.' },
    { status: 410 }
  )
}
