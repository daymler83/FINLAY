import crypto from 'node:crypto'
import MercadoPagoConfig, { Payment, PreApproval, Preference } from 'mercadopago'
import { NextRequest } from 'next/server'
import { PRO_PLANS, getProPlanByAmount, resolveProPlanKey, type ProPlanKey } from '@/lib/proAccess'

const DEFAULT_CURRENCY = process.env.MERCADOPAGO_CURRENCY_ID ?? 'CLP'
const MONTHLY_PRICE = Number(process.env.MERCADOPAGO_MONTHLY_PRICE ?? String(PRO_PLANS.monthly.priceClp))
const ANNUAL_PRICE = Number(process.env.MERCADOPAGO_ANNUAL_PRICE ?? String(PRO_PLANS.annual.priceClp))
const FREE_TRIAL_DAYS = Number(process.env.MERCADOPAGO_FREE_TRIAL_DAYS ?? '5')

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
    preApproval: new PreApproval(config),
    preference: new Preference(config),
  }
}

export function getMercadoPagoBaseUrls(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  return {
    success: `${normalizedBaseUrl}/pro/success?provider=mercadopago`,
    pending: `${normalizedBaseUrl}/pro/success?provider=mercadopago`,
    failure: `${normalizedBaseUrl}/pro?payment=failed&provider=mercadopago`,
  }
}

export function getMercadoPagoWebhookUrl(baseUrl: string) {
  const fromEnv = process.env.MERCADOPAGO_WEBHOOK_URL?.trim()
  if (fromEnv) return fromEnv
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  return `${normalizedBaseUrl}/api/mercadopago/webhook`
}

export async function createMercadoPagoSubscription(params: {
  userId: string
  email: string
  baseUrl: string
  planKey: ProPlanKey
  includeFreeTrial?: boolean
}) {
  const { preApproval } = createMercadoPagoClients()
  const normalizedBaseUrl = params.baseUrl.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production' && !normalizedBaseUrl.startsWith('https://')) {
    throw new Error('APP_URL debe usar https:// en producción para Mercado Pago')
  }

  const urls = getMercadoPagoBaseUrls(params.baseUrl)
  const webhookUrl = getMercadoPagoWebhookUrl(params.baseUrl)
  const plan = PRO_PLANS[params.planKey] ?? PRO_PLANS.monthly
  const price = plan.key === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Precio inválido para plan ${plan.key}. Revisa MERCADOPAGO_MONTHLY_PRICE/MERCADOPAGO_ANNUAL_PRICE`)
  }

  const freeTrial = params.includeFreeTrial && Number.isFinite(FREE_TRIAL_DAYS) && FREE_TRIAL_DAYS > 0
    ? {
        frequency: Math.floor(FREE_TRIAL_DAYS),
        frequency_type: 'days' as const,
      }
    : undefined

  const body = {
    reason: `FINLAY Pro ${plan.label}`,
    back_url: `${urls.success}&plan=${plan.key}`,
    notification_url: webhookUrl,
    external_reference: params.userId,
    payer_email: params.email,
    auto_recurring: {
      frequency: plan.durationDays === 365 ? 12 : 1,
      frequency_type: 'months',
      transaction_amount: price,
      currency_id: DEFAULT_CURRENCY,
      ...(freeTrial ? { free_trial: freeTrial } : {}),
    },
  } as unknown as Parameters<typeof preApproval.create>[0]['body']

  const result = await preApproval.create({ body })

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

export async function fetchMercadoPagoSubscription(subscriptionId: string) {
  const { preApproval } = createMercadoPagoClients()
  return preApproval.get({ id: subscriptionId })
}

export function resolveMercadoPagoPlan(value: unknown, amount?: unknown): ProPlanKey | null {
  return resolveProPlanKey(value) ?? getProPlanByAmount(amount)
}

export function shouldEnforceMercadoPagoWebhookSignature() {
  if (process.env.MERCADOPAGO_WEBHOOK_STRICT_SIGNATURE === 'false') {
    return false
  }

  return process.env.NODE_ENV === 'production'
}
