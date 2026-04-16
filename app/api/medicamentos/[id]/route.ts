import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { loadSyncedProUser } from '@/lib/proSubscription'
import { resolveClinicalCategory } from '@/lib/clinicalCategory'
import { formatMedicationDisplayName } from '@/lib/medicationDisplay'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión para continuar' }, { status: 401 })
  }

  const usuario = await loadSyncedProUser(session.userId)
  if (!usuario?.isPro) {
    return NextResponse.json({ error: 'Se requiere plan Pro activo. Los nuevos usuarios tienen 5 días gratis.' }, { status: 403 })
  }

  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }
  
  try {
    const medicamento = await prisma.medicamento.findUnique({
      where: { id }
    })
    
    if (!medicamento) {
      return NextResponse.json({ error: 'Medicamento no encontrado' }, { status: 404 })
    }
    
    return NextResponse.json({
      ...medicamento,
      nombre: formatMedicationDisplayName(medicamento.nombre),
      categoriaClinica: resolveClinicalCategory(medicamento.familia, medicamento.principioActivo),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
