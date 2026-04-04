import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveClinicalCategory } from '@/lib/clinicalCategory'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      categoriaClinica: resolveClinicalCategory(medicamento.familia, medicamento.principioActivo),
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
