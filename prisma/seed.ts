import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const medicamentos = [
    {
      nombre: "Enalapril 20mg",
      principioActivo: "Enalapril",
      familia: "IECA",
      presentacion: "Comprimido 20mg",
      laboratorio: "Varios (genérico)",
      precioReferencia: 4500,
      vidaMedia: "11 h",
      nivelInteracciones: "Bajo",
      efectosAdversos: ["Tos seca", "Mareos", "Hipotensión"],
      contraindicaciones: ["Embarazo", "Estenosis renal bilateral"],
      indicaciones: ["Hipertensión arterial", "Insuficiencia cardíaca"]
    },
    {
      nombre: "Losartán 50mg",
      principioActivo: "Losartán",
      familia: "ARA-II",
      presentacion: "Comprimido 50mg",
      laboratorio: "Merck",
      precioReferencia: 8900,
      vidaMedia: "2 h",
      nivelInteracciones: "Bajo",
      efectosAdversos: ["Mareos", "Fatiga", "Hiperkalemia"],
      contraindicaciones: ["Embarazo", "Insuficiencia hepática severa"],
      indicaciones: ["Hipertensión arterial", "Nefropatía diabética"]
    },
    {
      nombre: "Amlodipino 5mg",
      principioActivo: "Amlodipino",
      familia: "Bloqueador de canales de calcio",
      presentacion: "Comprimido 5mg",
      laboratorio: "Pfizer",
      precioReferencia: 7200,
      vidaMedia: "30-50 h",
      nivelInteracciones: "Moderado",
      efectosAdversos: ["Edema de tobillos", "Rubor facial", "Palpitaciones"],
      contraindicaciones: ["Hipotensión severa", "Shock cardiogénico"],
      indicaciones: ["Hipertensión arterial", "Angina de pecho"]
    }
  ]

  for (const med of medicamentos) {
    await prisma.medicamento.upsert({
      where: { nombre: med.nombre },
      update: med,
      create: med
    })
    console.log(`✅ Agregado: ${med.nombre}`)
  }

  console.log('✅ Seed completado exitosamente')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
