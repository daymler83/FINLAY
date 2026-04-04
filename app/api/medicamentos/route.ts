import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ClinicalCategory, matchesClinicalCategory, resolveClinicalCategory } from '@/lib/clinicalCategory'

const FREE_LIMIT = 20
const PRO_LIMIT  = 500

type MedicamentoBase = {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  precioReferencia: number | null
  vidaMedia: string | null
  nivelInteracciones: string | null
}

type MedicamentoConCategoria = MedicamentoBase & {
  categoriaClinica: ClinicalCategory
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const categoria = searchParams.get('categoria')

  const session = await getSession()
  const isPro = session?.isPro ?? false
  const limit  = isPro ? PRO_LIMIT : FREE_LIMIT

  const where: Prisma.MedicamentoWhereInput = {}
  if (q) {
    where.OR = [
      { nombre:          { contains: q, mode: 'insensitive' } },
      { principioActivo: { contains: q, mode: 'insensitive' } },
      { familia:         { contains: q, mode: 'insensitive' } },
    ]
  }

  try {
    const medicamentosBase = await prisma.medicamento.findMany({
      where,
      orderBy: { nombre: 'asc' },
      select: {
        id: true, nombre: true, principioActivo: true,
        presentacion: true, familia: true, laboratorio: true,
        precioReferencia: true, vidaMedia: true, nivelInteracciones: true,
      },
    })

    const medicamentosFiltrados = categoria
      ? medicamentosBase.filter(med => matchesClinicalCategory(med.familia, med.principioActivo, categoria as ClinicalCategory))
      : medicamentosBase

    const total = medicamentosFiltrados.length
    const medicamentos = medicamentosFiltrados.slice(0, limit).map((med): MedicamentoConCategoria => ({
      ...med,
      categoriaClinica: resolveClinicalCategory(med.familia, med.principioActivo),
    }))

    return NextResponse.json({ medicamentos, total, isPro, limit })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
