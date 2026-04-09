export type ProPlanKey = 'monthly' | 'annual'

export type ProPlanConfig = {
  key: ProPlanKey
  label: string
  priceClp: number
  durationDays: number
  priceLabel: string
  subtitle: string
}

export const PRO_PLANS: Record<ProPlanKey, ProPlanConfig> = {
  monthly: {
    key: 'monthly',
    label: 'Mensual',
    priceClp: 18990,
    durationDays: 30,
    priceLabel: '$18.990',
    subtitle: 'Acceso completo por 30 días',
  },
  annual: {
    key: 'annual',
    label: 'Anual',
    priceClp: 148990,
    durationDays: 365,
    priceLabel: '$148.990',
    subtitle: 'Acceso completo por 1 año',
  },
}

export const PRO_PLAN_LIST = Object.values(PRO_PLANS)

export type UserProState = {
  isPro: boolean
  proExpiresAt?: Date | string | null
  proPlan?: string | null
  proSubscriptionStatus?: string | null
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['authorized', 'active'])
const INACTIVE_SUBSCRIPTION_STATUSES = new Set(['cancelled', 'canceled', 'paused', 'expired', 'rejected', 'ended'])

export function hasActiveProAccess(user: UserProState | null | undefined, now = new Date()) {
  if (!user?.isPro) return false

  const status = String(user.proSubscriptionStatus ?? '').trim().toLowerCase()
  if (status && ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return true
  if (status && INACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false

  if (!user.proExpiresAt) return true

  const expiresAt = new Date(user.proExpiresAt)
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime()
}

export function resolveProPlanKey(value: unknown): ProPlanKey | null {
  if (value === 'monthly' || value === 'mensual') return 'monthly'
  if (value === 'annual' || value === 'anual') return 'annual'

  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null

  if (normalized.includes('148990') || normalized.includes('annual') || normalized.includes('anual')) {
    return 'annual'
  }

  if (normalized.includes('18990') || normalized.includes('monthly') || normalized.includes('mensual')) {
    return 'monthly'
  }

  if (normalized === '1') return 'monthly'
  if (normalized === '2') return 'annual'

  return null
}

export function getProPlanByAmount(amount: unknown): ProPlanKey | null {
  const numeric = typeof amount === 'number' ? amount : Number(amount)

  if (!Number.isFinite(numeric)) return null
  if (numeric === PRO_PLANS.monthly.priceClp) return 'monthly'
  if (numeric === PRO_PLANS.annual.priceClp) return 'annual'

  return null
}

export function getProExpiryDate(currentExpiresAt: Date | string | null | undefined, durationDays: number) {
  const now = new Date()
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null
  const base = current && Number.isFinite(current.getTime()) && current.getTime() > now.getTime()
    ? current
    : now

  const expiry = new Date(base)
  expiry.setDate(expiry.getDate() + durationDays)
  return expiry
}
