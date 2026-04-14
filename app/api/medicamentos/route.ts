import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ClinicalCategory, getAllClinicalCategoryMatchers, getClinicalCategoryMatchers, isClinicalCategory, resolveClinicalCategory } from '@/lib/clinicalCategory'
import { loadSyncedProUser } from '@/lib/proSubscription'

const FREE_LIMIT = 10
const PRO_LIMIT  = 500
export const dynamic = 'force-dynamic'

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
  const categoriaRaw = searchParams.get('categoria')
  const categoria = categoriaRaw && isClinicalCategory(categoriaRaw) ? categoriaRaw : null

  if (categoriaRaw && !categoria) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const session = await getSession()
  const usuario = session ? await loadSyncedProUser(session.userId) : null
  const isPro = Boolean(usuario?.isPro)
  const limit  = isPro ? PRO_LIMIT : FREE_LIMIT

  const where: Prisma.MedicamentoWhereInput = {
    precioReferencia: { gt: 0 },
  }
  if (q) {
    where.OR = [
      { nombre:          { contains: q, mode: 'insensitive' } },
      { principioActivo: { contains: q, mode: 'insensitive' } },
      { laboratorio:     { contains: q, mode: 'insensitive' } },
      { familia:         { contains: q, mode: 'insensitive' } },
    ]
  }

  const andFilters: Prisma.MedicamentoWhereInput[] = []

  if (categoria) {
    const termToFilters = (terms: string[]): Prisma.MedicamentoWhereInput[] => terms.flatMap(term => ([
      { familia: { contains: term, mode: Prisma.QueryMode.insensitive } },
      { principioActivo: { contains: term, mode: Prisma.QueryMode.insensitive } },
    ]))

    if (categoria === 'otros') {
      const allKnownTerms = getAllClinicalCategoryMatchers()
      andFilters.push({
        NOT: {
          OR: termToFilters(allKnownTerms),
        },
      })
    } else {
      andFilters.push({
        OR: termToFilters(getClinicalCategoryMatchers(categoria)),
      })
    }
  }

  if (andFilters.length > 0) {
    where.AND = andFilters
  }

  try {
    const [total, medicamentosBase] = await prisma.$transaction([
      prisma.medicamento.count({ where }),
      prisma.medicamento.findMany({
        where,
        orderBy: { nombre: 'asc' },
        select: {
          id: true, nombre: true, principioActivo: true,
          presentacion: true, familia: true, laboratorio: true,
          precioReferencia: true, vidaMedia: true, nivelInteracciones: true,
        },
        take: limit,
      }),
    ])

    const medicamentos = medicamentosBase.map((med): MedicamentoConCategoria => ({
      ...med,
      categoriaClinica: resolveClinicalCategory(med.familia, med.principioActivo),
    }))

    return NextResponse.json({ medicamentos, total, isPro, limit })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
