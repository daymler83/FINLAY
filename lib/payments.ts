import { prisma } from '@/lib/prisma'

type PaymentProvider = 'stripe' | 'mercadopago'

export async function activateProUser(
  userId: string,
  provider: PaymentProvider,
  providerReference?: string | null
) {
  const data: { isPro: boolean; stripeId?: string } = { isPro: true }

  if (provider === 'stripe' && providerReference) {
    data.stripeId = providerReference
  }

  const result = await prisma.usuario.updateMany({
    where: { id: userId },
    data,
  })

  return result.count > 0
}
