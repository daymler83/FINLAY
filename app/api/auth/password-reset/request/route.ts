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
    const msg = error instanceof Error ? error.message : ''
    if (msg === 'mail_not_configured') {
      return NextResponse.json(
        { error: 'El envío de emails no está configurado. Contacta al soporte en soporte@finlay.cl' },
        { status: 503 }
      )
    }
    if (msg === 'mail_send_timeout') {
      return NextResponse.json(
        { error: 'No se pudo enviar el email (timeout). Intenta nuevamente en unos minutos.' },
        { status: 503 }
      )
    }
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
