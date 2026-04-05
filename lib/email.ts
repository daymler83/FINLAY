import nodemailer from 'nodemailer'

type PasswordResetEmailInput = {
  to: string
  code: string
}

export type PasswordResetDelivery = 'smtp' | 'console'

function getSmtpConfig() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '')
  const from = process.env.MAIL_FROM

  if (!host || !port || !user || !pass || !from) {
    return null
  }

  return { host, port, user, pass, from }
}

export async function sendPasswordResetEmail({
  to,
  code,
}: PasswordResetEmailInput): Promise<PasswordResetDelivery> {
  const smtp = getSmtpConfig()
  const subject = 'Restablece tu contraseña de FarmaChile'
  const text = [
    'Hola,',
    '',
    'Recibimos una solicitud para restablecer tu contraseña en FarmaChile.',
    `Tu código de recuperación es: ${code}`,
    '',
    'Si no solicitaste este cambio, puedes ignorar este mensaje.',
  ].join('\n')

  const html = `
    <p>Hola,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en FarmaChile.</p>
    <p>Tu código de recuperación es: <strong>${code}</strong></p>
    <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
  `

  if (!smtp) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('mail_not_configured')
    }

    console.info(`[mail:dev] Password reset for ${to}: ${code}`)
    return 'console'
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  })

  const info = await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html,
  })

  console.info(
    `[mail:smtp] accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} response=${info.response}`,
  )

  return 'smtp'
}
