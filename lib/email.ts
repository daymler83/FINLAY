import nodemailer from 'nodemailer'

type PasswordResetEmailInput = {
  to: string
  code: string
}

export type PasswordResetDelivery = 'smtp' | 'console'
type FeedbackNotificationInput = {
  to: string
  type: string
  rating: number
  title?: string | null
  message: string
  userEmail?: string | null
  userId?: string | null
}

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
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 10000,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  })
  const timeoutMs = 12000
  let timeout: NodeJS.Timeout | null = null

  const info = await Promise.race([
    transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text,
      html,
    }),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('mail_send_timeout')), timeoutMs)
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })

  console.info(
    `[mail:smtp] accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} response=${info.response}`,
  )

  return 'smtp'
}

export async function sendFeedbackNotification({
  to,
  type,
  rating,
  title,
  message,
  userEmail,
  userId,
}: FeedbackNotificationInput): Promise<PasswordResetDelivery> {
  const smtp = getSmtpConfig()
  const subject = `Nuevo feedback FINLAY (${type})`
  const safeTitle = title?.trim() ? title.trim() : '(sin título)'
  const safeEmail = userEmail?.trim() ? userEmail.trim() : '(sin email)'
  const safeUserId = userId?.trim() ? userId.trim() : '(anónimo)'
  const now = new Date().toISOString()

  const text = [
    'Nuevo feedback recibido en FINLAY',
    '',
    `Fecha: ${now}`,
    `Tipo: ${type}`,
    `Rating: ${rating}/5`,
    `Título: ${safeTitle}`,
    `Email usuario: ${safeEmail}`,
    `User ID: ${safeUserId}`,
    '',
    'Mensaje:',
    message,
  ].join('\n')

  const html = `
    <p><strong>Nuevo feedback recibido en FINLAY</strong></p>
    <p><strong>Fecha:</strong> ${now}</p>
    <p><strong>Tipo:</strong> ${type}</p>
    <p><strong>Rating:</strong> ${rating}/5</p>
    <p><strong>Título:</strong> ${safeTitle}</p>
    <p><strong>Email usuario:</strong> ${safeEmail}</p>
    <p><strong>User ID:</strong> ${safeUserId}</p>
    <p><strong>Mensaje:</strong></p>
    <pre style="white-space: pre-wrap; font-family: inherit;">${message}</pre>
  `

  if (!smtp) {
    console.info(`[mail:dev] Feedback notification for ${to}\n${text}`)
    return 'console'
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    connectionTimeout: 7000,
    greetingTimeout: 7000,
    socketTimeout: 10000,
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
    `[mail:smtp] feedback accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} response=${info.response}`,
  )

  return 'smtp'
}
