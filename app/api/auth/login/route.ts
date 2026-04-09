import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import { hasActiveProAccess } from '@/lib/proAccess'

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe = true } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!usuario.password) {
      return NextResponse.json(
        { error: 'Esta cuenta usa acceso con Google o Microsoft' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, usuario.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const isPro = hasActiveProAccess(usuario)
    const token = await createToken({ userId: usuario.id, email: usuario.email, isPro })

    const response = NextResponse.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        isPro,
        proPlan: usuario.proPlan ?? null,
        proExpiresAt: usuario.proExpiresAt?.toISOString() ?? null,
      },
    })
    setSessionCookie(response, token, Boolean(rememberMe))

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
