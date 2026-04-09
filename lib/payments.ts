import { prisma } from '@/lib/prisma'
import {
  getProExpiryDate,
  PRO_PLANS,
  type ProPlanKey,
} from '@/lib/proAccess'

type PaymentProvider = 'stripe' | 'mercadopago'

export async function activateProUser(
  userId: string,
  provider: PaymentProvider,
  planKey: ProPlanKey,
  providerReference?: string | null
) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { isPro: true, proExpiresAt: true, proPlan: true },
  })

  if (!user) return false
  if (user.isPro && !user.proExpiresAt) return true

  const plan = PRO_PLANS[planKey] ?? PRO_PLANS.monthly
  const expiresAt = getProExpiryDate(user.proExpiresAt, plan.durationDays)

  const data: { isPro: boolean; proPlan: string; proExpiresAt: Date; stripeId?: string } = {
    isPro: true,
    proPlan: plan.key,
    proExpiresAt: expiresAt,
  }

  if (provider === 'stripe' && providerReference) {
    data.stripeId = providerReference
  }

  const result = await prisma.usuario.updateMany({
    where: { id: userId },
    data,
  })

  return result.count > 0
}
