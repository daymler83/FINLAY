import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createMercadoPagoPreference } from '@/lib/mercadoPago'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  try {
    const preference = await createMercadoPagoPreference({
      userId: session.userId,
      email: session.email,
      baseUrl,
    })

    if (!preference.init_point) {
      return NextResponse.json({ error: 'No se pudo generar el checkout de Mercado Pago' }, { status: 500 })
    }

    return NextResponse.json({
      url: preference.init_point,
      preferenceId: preference.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al crear preferencia de Mercado Pago'
    const details = error && typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : ''
    console.error('Mercado Pago checkout error:', message, details)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
