import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null })
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, nombre: true, isPro: true },
  })

  return NextResponse.json({ user: usuario })
}
