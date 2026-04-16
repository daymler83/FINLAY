import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadSyncedProUser } from '@/lib/proSubscription'

export async function GET() {
  const session = await getSession()
  const usuario = session ? await loadSyncedProUser(session.userId) : null
  if (!usuario?.isPro) {
    return NextResponse.json({ error: 'Se requiere plan Pro' }, { status: 403 })
  }

  try {
    const events = await prisma.sidebarEvent.findMany({
      orderBy: { date: 'asc' },
      take: 20,
    })
    return NextResponse.json({ events })
  } catch (err) {
    console.error('[sidebar/events]', err)
    return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 })
  }
}
