import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  
  const where: any = {}
  
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { principioActivo: { contains: q, mode: 'insensitive' } }
    ]
  }
  
  try {
    const medicamentos = await prisma.medicamento.findMany({
      where,
      take: 50,
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json(medicamentos)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}