/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.QA_EMAIL || 'qa.pro.local@finlay.local').trim().toLowerCase()
  const password = process.env.QA_PASSWORD || 'FinlayQA!2026#Pro'
  const nombre = process.env.QA_NAME || 'QA Pro Local'

  if (!email || !password) {
    throw new Error('Debes definir QA_EMAIL y QA_PASSWORD (o usar los valores por defecto).')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const proExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  const user = await prisma.usuario.upsert({
    where: { email },
    update: {
      nombre,
      password: passwordHash,
      isPro: true,
      proPlan: 'monthly',
      proSubscriptionId: null,
      proSubscriptionStatus: 'active',
      proExpiresAt,
    },
    create: {
      email,
      nombre,
      password: passwordHash,
      isPro: true,
      proPlan: 'monthly',
      proSubscriptionId: null,
      proSubscriptionStatus: 'active',
      proExpiresAt,
    },
    select: {
      id: true,
      email: true,
      isPro: true,
      proPlan: true,
      proSubscriptionStatus: true,
      proExpiresAt: true,
    },
  })

  console.log('Usuario QA Pro listo:')
  console.log(`- email: ${email}`)
  console.log(`- password: ${password}`)
  console.log(`- isPro: ${user.isPro}`)
  console.log(`- proPlan: ${user.proPlan}`)
  console.log(`- proSubscriptionStatus: ${user.proSubscriptionStatus}`)
  console.log(`- proExpiresAt: ${user.proExpiresAt?.toISOString()}`)
}

main()
  .catch(error => {
    console.error('Error creando usuario QA local:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
