const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed simple...')
  
  try {
    // Contar medicamentos existentes
    const count = await prisma.medicamento.count()
    console.log(`📊 Medicamentos actuales: ${count}`)
    
    if (count === 0) {
      console.log('Agregando medicamento de prueba...')
      await prisma.medicamento.create({
        data: {
          nombre: "Enalapril 20mg",
          principioActivo: "Enalapril",
          familia: "IECA",
          presentacion: "Comprimido 20mg",
          laboratorio: "Genérico",
          efectosAdversos: ["Tos seca", "Mareos"],
          contraindicaciones: ["Embarazo"],
          indicaciones: ["Hipertensión"]
        }
      })
      console.log('✅ Medicamento agregado')
    } else {
      console.log('⚠️ Ya hay medicamentos, no se agregan nuevos')
    }
    
    const finalCount = await prisma.medicamento.count()
    console.log(`📊 Total final: ${finalCount}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()