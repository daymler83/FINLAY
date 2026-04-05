import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { isPro: true },
  })

  if (!usuario?.isPro) return NextResponse.json({ error: 'Requiere Pro' }, { status: 403 })

  const historial = await prisma.historialBusqueda.findMany({
    where: { usuarioId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, query: true, createdAt: true },
  })

  return NextResponse.json(historial)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { isPro: true },
  })

  if (!usuario?.isPro) return NextResponse.json({ ok: false })

  const { query } = await request.json()
  if (!query?.trim()) return NextResponse.json({ ok: false })

  await prisma.historialBusqueda.create({
    data: { usuarioId: session.userId, query: query.trim() },
  })

  return NextResponse.json({ ok: true })
}
