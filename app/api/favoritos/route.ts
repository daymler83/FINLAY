import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { resolveClinicalCategory } from '@/lib/clinicalCategory'
import { formatMedicationDisplayName } from '@/lib/medicationDisplay'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const favoritos = await prisma.favorito.findMany({
    where: { usuarioId: session.userId },
    include: {
      medicamento: {
        select: {
          id: true, nombre: true, principioActivo: true,
          presentacion: true, familia: true, laboratorio: true,
          precioReferencia: true, vidaMedia: true, nivelInteracciones: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    favoritos.map(f => ({
      ...f.medicamento,
      nombre: formatMedicationDisplayName(f.medicamento.nombre),
      categoriaClinica: resolveClinicalCategory(f.medicamento.familia, f.medicamento.principioActivo),
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { medicamentoId } = await request.json()
  if (!medicamentoId) return NextResponse.json({ error: 'medicamentoId requerido' }, { status: 400 })

  try {
    await prisma.favorito.create({
      data: { usuarioId: session.userId, medicamentoId },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya está en favoritos' }, { status: 409 })
      }

      if (error.code === 'P2003') {
        return NextResponse.json({ error: 'Medicamento inválido' }, { status: 400 })
      }
    }

    console.error('Error agregando favorito:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
