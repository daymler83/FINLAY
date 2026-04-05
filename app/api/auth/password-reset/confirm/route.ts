import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { hashPasswordResetCode } from '@/lib/passwordReset'

export async function POST(request: NextRequest) {
  try {
    const { email, code, password, confirmPassword } = await request.json()

    if (!email || !code || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const codeHash = hashPasswordResetCode(code)
    const usuario = await prisma.usuario.findFirst({
      where: {
        email,
        passwordResetTokenHash: codeHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'El código expiró o es inválido' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Tu contraseña se actualizó correctamente',
    })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
