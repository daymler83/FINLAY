import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

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
    
    return NextResponse.json(medicamento)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
