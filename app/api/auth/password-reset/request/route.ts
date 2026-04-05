import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetCode } from '@/lib/passwordReset'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 })
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      return NextResponse.json({
        ok: true,
        message: 'Si el correo existe, te enviaremos un código de recuperación.',
      })
    }

    const { code, codeHash, expiresAt } = createPasswordResetCode()
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        passwordResetTokenHash: codeHash,
        passwordResetExpiresAt: expiresAt,
      },
    })

    const delivery = await sendPasswordResetEmail({
      to: usuario.email,
      code,
    })

    return NextResponse.json({
      ok: true,
      message: 'Si el correo existe, te enviaremos un código de recuperación.',
      delivery,
    })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
