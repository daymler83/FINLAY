/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.QA_EMAIL || 'qa.pro.local@finlay.local').trim().toLowerCase()

  const updated = await prisma.usuario.updateMany({
    where: { email },
    data: {
      isPro: false,
      proPlan: null,
      proSubscriptionId: null,
      proSubscriptionStatus: null,
      proExpiresAt: null,
    },
  })

  if (updated.count === 0) {
    console.log(`No se encontró usuario con email ${email}. Nada que desactivar.`)
    return
  }

  console.log(`Usuario ${email} desactivado (sin acceso Pro).`)
}

main()
  .catch(error => {
    console.error('Error desactivando usuario QA local:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
