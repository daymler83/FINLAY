import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, nombre, rememberMe = true } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const usuario = await prisma.usuario.create({
      data: { email, password: passwordHash, nombre: nombre ?? null },
    })

    const token = await createToken({ userId: usuario.id, email: usuario.email, isPro: usuario.isPro })

    const response = NextResponse.json({
      user: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, isPro: usuario.isPro },
    }, { status: 201 })
    setSessionCookie(response, token, Boolean(rememberMe))

    return response
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
