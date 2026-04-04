/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const medicamentos = [
    {
      nombre: "Enalapril 20mg",
      principioActivo: "Enalapril",
      familia: "IECA",
      presentacion: "Comprimido 20mg",
      laboratorio: "Genérico",
      precioReferencia: 4500,
      farmacia: "Salcobrand",
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
      farmacia: "Cruz Verde",
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
      farmacia: "Ahumada",
      efectosAdversos: ["Edema de tobillos", "Rubor facial", "Palpitaciones"],
      contraindicaciones: ["Hipotensión severa", "Shock cardiogénico"],
      indicaciones: ["Hipertensión arterial", "Angina de pecho"]
    }
  ]

  for (const med of medicamentos) {
    await prisma.medicamento.create({
      data: med
    })
    console.log(`✅ Agregado: ${med.nombre}`)
  }

  console.log('✅ Seed completado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
