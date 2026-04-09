import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveProAccess } from '@/lib/proAccess'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, nombre: true, isPro: true, proPlan: true, proExpiresAt: true },
  })

  if (!usuario) {
    return NextResponse.json({ user: null })
  }

  const isPro = hasActiveProAccess(usuario)

  return NextResponse.json({
    user: {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      isPro,
      proPlan: usuario.proPlan ?? null,
      proExpiresAt: usuario.proExpiresAt?.toISOString() ?? null,
    },
  })
}
