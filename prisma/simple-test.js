const { PrismaClient } = require('@prisma/client')

console.log('1. Importación exitosa')

const prisma = new PrismaClient()

console.log('2. Cliente creado')

prisma.$connect()
  .then(() => {
    console.log('3. Conectado a la base de datos')
    return prisma.$queryRaw`SELECT 1 as test`
  })
  .then(result => {
    console.log('4. Consulta exitosa:', result)
  })
  .catch(err => {
    console.error('Error:', err)
  })
  .finally(() => {
    prisma.$disconnect()
  })
