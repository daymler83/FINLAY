import { prisma } from '@/lib/prisma'
import { fetchMercadoPagoSubscription } from '@/lib/mercadoPago'
import { getProPlanByAmount, hasActiveProAccess, resolveProPlanKey, type ProPlanKey } from '@/lib/proAccess'

type UserWithSubscription = {
  id: string
  email: string
  nombre: string | null
  isPro: boolean
  proPlan: string | null
  proSubscriptionId: string | null
  proSubscriptionStatus: string | null
  proExpiresAt: Date | null
}

type MercadoPagoSubscriptionSnapshot = {
  id?: string | null
  status?: string | null
  external_reference?: string | number | null
  next_payment_date?: unknown
  preapproval_plan_id?: string | null
  auto_recurring?: { transaction_amount?: number | null }
}

export type SyncedProUser = Omit<UserWithSubscription, 'proSubscriptionId'> & {
  isPro: boolean
  proSubscriptionId: string | null
  aiConsultas: number
}

function parseMercadoPagoDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value

  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = value > 1e12 ? value : value * 1000
    const date = new Date(normalized)
    return Number.isFinite(date.getTime()) ? date : null
  }

  const date = new Date(String(value))
  return Number.isFinite(date.getTime()) ? date : null
}

function resolvePlanKeyFromSubscription(subscription: {
  preapproval_plan_id?: string | null
  auto_recurring?: { transaction_amount?: number | null }
}, fallback: string | null): ProPlanKey | null {
  return resolveProPlanKey(subscription.preapproval_plan_id) ??
    getProPlanByAmount(subscription.auto_recurring?.transaction_amount) ??
    resolveProPlanKey(fallback) ??
    null
}

async function applyMercadoPagoSubscriptionSnapshot(user: UserWithSubscription, subscription: MercadoPagoSubscriptionSnapshot) {
  const status = String(subscription.status ?? '').trim().toLowerCase() || null
  const isActive = status ? ['authorized', 'active'].includes(status) : false
  const nextBillingAt = parseMercadoPagoDate(subscription.next_payment_date)
  const planKey = resolvePlanKeyFromSubscription(subscription, user.proPlan)
  const subscriptionId = typeof subscription.id === 'string' ? subscription.id : user.proSubscriptionId

  return prisma.usuario.update({
    where: { id: user.id },
    data: {
      isPro: isActive,
      proPlan: planKey,
      proSubscriptionId: subscriptionId,
      proSubscriptionStatus: status,
      proExpiresAt: isActive ? nextBillingAt : null,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      isPro: true,
      proPlan: true,
      proSubscriptionId: true,
      proSubscriptionStatus: true,
      proExpiresAt: true,
    },
  })
}

export async function loadSyncedProUser(userId: string): Promise<SyncedProUser | null> {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      isPro: true,
      proPlan: true,
      proSubscriptionId: true,
      proSubscriptionStatus: true,
      proExpiresAt: true,
      aiConsultas: true,
    },
  })

  if (!user) return null

  if (!user.proSubscriptionId) {
    return {
      ...user,
      isPro: hasActiveProAccess(user),
    }
  }

  try {
    const subscription = await fetchMercadoPagoSubscription(user.proSubscriptionId)
    const updated = await applyMercadoPagoSubscriptionSnapshot(user, subscription)
    return { ...updated, aiConsultas: user.aiConsultas, isPro: hasActiveProAccess(updated) }
  } catch (error) {
    console.warn('No se pudo sincronizar la suscripción Pro:', error instanceof Error ? error.message : error)
    return {
      ...user,
      isPro: hasActiveProAccess(user),
    }
  }
}

export async function storePendingProSubscription(params: {
  userId: string
  subscriptionId: string
  planKey: ProPlanKey
}) {
  await prisma.usuario.update({
    where: { id: params.userId },
    data: {
      isPro: false,
      proPlan: params.planKey,
      proSubscriptionId: params.subscriptionId,
      proSubscriptionStatus: 'pending',
      proExpiresAt: null,
    },
  })
}

export async function syncUserFromMercadoPagoSubscription(params: {
  userId: string
  subscription: MercadoPagoSubscriptionSnapshot
}) {
  const user = await prisma.usuario.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      nombre: true,
      isPro: true,
      proPlan: true,
      proSubscriptionId: true,
      proSubscriptionStatus: true,
      proExpiresAt: true,
    },
  })

  if (!user) return null

  const updated = await applyMercadoPagoSubscriptionSnapshot(user, params.subscription)
  return {
    ...updated,
    isPro: hasActiveProAccess(updated),
  }
}
