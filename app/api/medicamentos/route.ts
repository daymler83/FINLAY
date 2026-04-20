import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ClinicalCategory, getAllClinicalCategoryMatchers, getClinicalCategoryMatchers, isClinicalCategory, resolveClinicalCategory } from '@/lib/clinicalCategory'
import { loadSyncedProUser } from '@/lib/proSubscription'
import { formatMedicationDisplayName } from '@/lib/medicationDisplay'
import { isFreePeriodActive } from '@/lib/freePeriod'

const PRO_LIMIT  = 500
export const dynamic = 'force-dynamic'

type MedicamentoBase = {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  registroIsp: string | null
  estadoRegistroIsp: string | null
  titularRegistroIsp: string | null
  precioReferencia: number | null
  vidaMedia: string | null
  nivelInteracciones: string | null
}

type MedicamentoConCategoria = MedicamentoBase & {
  categoriaClinica: ClinicalCategory
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const categoriaRaw = searchParams.get('categoria')
  const categoria = categoriaRaw && isClinicalCategory(categoriaRaw) ? categoriaRaw : null

  if (categoriaRaw && !categoria) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión para continuar' }, { status: 401 })
  }

  const usuario = await loadSyncedProUser(session.userId)
  const isPro = Boolean(usuario?.isPro) || isFreePeriodActive()
  if (!isPro) {
    return NextResponse.json({ error: 'Se requiere plan Pro activo. Los nuevos usuarios tienen 5 días gratis.' }, { status: 403 })
  }

  const limit = PRO_LIMIT

  const where: Prisma.MedicamentoWhereInput = {
    precioReferencia: { gt: 0 },
  }

  const andFilters: Prisma.MedicamentoWhereInput[] = []

  if (q) {
    const terms = q
      .split(/[\s,;/]+/)
      .map(term => term.trim())
      .filter(Boolean)
      .slice(0, 6)

    for (const term of terms) {
      andFilters.push({
        OR: [
          { nombre:          { contains: term, mode: Prisma.QueryMode.insensitive } },
          { principioActivo: { contains: term, mode: Prisma.QueryMode.insensitive } },
          { laboratorio:     { contains: term, mode: Prisma.QueryMode.insensitive } },
          { familia:         { contains: term, mode: Prisma.QueryMode.insensitive } },
          { presentacion:    { contains: term, mode: Prisma.QueryMode.insensitive } },
        ],
      })
    }
  }

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
          registroIsp: true, estadoRegistroIsp: true, titularRegistroIsp: true,
          precioReferencia: true, vidaMedia: true, nivelInteracciones: true,
        },
        take: limit,
      }),
    ])

    const medicamentos = medicamentosBase.map((med): MedicamentoConCategoria => ({
      ...med,
      nombre: formatMedicationDisplayName(med.nombre),
      categoriaClinica: resolveClinicalCategory(med.familia, med.principioActivo),
    }))

    return NextResponse.json({ medicamentos, total, isPro, limit })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
