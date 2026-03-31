const { PrismaClient } = require('@prisma/client')

console.log('PrismaClient importado:', typeof PrismaClient)

const prisma = new PrismaClient()

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as now`
    console.log('✅ Conexión exitosa:', result)
  } catch (err) {
    console.error('❌ Error de conexión:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
