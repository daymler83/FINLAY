import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ medicamentoId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { medicamentoId } = await params

  await prisma.favorito.deleteMany({
    where: { usuarioId: session.userId, medicamentoId },
  })

  return NextResponse.json({ ok: true })
}
