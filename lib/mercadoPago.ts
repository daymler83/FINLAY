import crypto from 'node:crypto'
import MercadoPagoConfig, { Payment, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'

const DEFAULT_CURRENCY = process.env.MERCADOPAGO_CURRENCY_ID ?? 'CLP'
const PRO_PRICE = Number(process.env.MERCADOPAGO_PRO_PRICE ?? '20000')

export function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('Falta configurar MERCADOPAGO_ACCESS_TOKEN')
  }

  return new MercadoPagoConfig({ accessToken })
}

export function createMercadoPagoClients() {
  const config = getMercadoPagoConfig()

  return {
    payment: new Payment(config),
    preference: new Preference(config),
  }
}

export function getMercadoPagoBaseUrls(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    success: `${normalizedBaseUrl}/pro/success?provider=mercadopago`,
    pending: `${normalizedBaseUrl}/pro/success?provider=mercadopago`,
    failure: `${normalizedBaseUrl}/pro?payment=failed&provider=mercadopago`,
    webhook: `${normalizedBaseUrl}/api/mercadopago/webhook`,
  }
}

export async function createMercadoPagoPreference(params: {
  userId: string
  email: string
  baseUrl: string
}) {
  const { preference } = createMercadoPagoClients()
  const urls = getMercadoPagoBaseUrls(params.baseUrl)

  const result = await preference.create({
    body: {
      items: [
        {
          id: 'finlay-pro',
          title: 'FINLAY Pro',
          description: 'Acceso de por vida a toda la información clínica de FINLAY.',
          quantity: 1,
          unit_price: PRO_PRICE,
          currency_id: DEFAULT_CURRENCY,
        },
      ],
      external_reference: params.userId,
      payer: {
        email: params.email,
      },
      back_urls: {
        success: urls.success,
        pending: urls.pending,
        failure: urls.failure,
      },
      notification_url: urls.webhook,
      binary_mode: true,
      statement_descriptor: 'FINLAY PRO',
      metadata: {
        product: 'finlay-pro',
        userId: params.userId,
      },
    },
  })

  return result
}

function parseSignatureHeader(signatureHeader: string) {
  const entries = signatureHeader
    .split(',')
    .map(part => part.trim())
    .map(part => part.split('='))
    .filter(([key, value]) => key && value)

  return Object.fromEntries(entries) as Record<string, string>
}

export function validateMercadoPagoWebhookSignature(params: {
  request: NextRequest
  dataId: string | number
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Falta configurar MERCADOPAGO_WEBHOOK_SECRET en producción')
    }

    return true
  }

  const signatureHeader = params.request.headers.get('x-signature')
  const requestId = params.request.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return false

  const parsed = parseSignatureHeader(signatureHeader)
  const ts = parsed.ts
  const v1 = parsed.v1
  if (!ts || !v1) return false

  const manifest = `id:${String(params.dataId).toLowerCase()};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return expected === v1
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const { payment } = createMercadoPagoClients()
  return payment.get({ id: paymentId })
}

export function shouldEnforceMercadoPagoWebhookSignature() {
  if (process.env.MERCADOPAGO_WEBHOOK_STRICT_SIGNATURE === 'false') {
    return false
  }

  return process.env.NODE_ENV === 'production'
}
