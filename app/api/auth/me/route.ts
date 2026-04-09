import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { loadSyncedProUser } from '@/lib/proSubscription'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  const usuario = await loadSyncedProUser(session.userId)

  if (!usuario) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      isPro: usuario.isPro,
      proPlan: usuario.proPlan ?? null,
      proSubscriptionId: usuario.proSubscriptionId ?? null,
      proSubscriptionStatus: usuario.proSubscriptionStatus ?? null,
      proExpiresAt: usuario.proExpiresAt?.toISOString() ?? null,
    },
  })
}
