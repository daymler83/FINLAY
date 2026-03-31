import { NextResponse } from 'next/server'

// Por ahora, datos mock hasta que configuremos Prisma
const medicamentosMock = [
  {
    id: "1",
    nombre: "Enalapril 20mg",
    principioActivo: "Enalapril",
    familia: "IECA",
    presentacion: "Comprimido 20mg",
    laboratorio: "Varios (genérico)",
    precioReferencia: 4500,
    farmacia: "Salcobrand",
    efectosAdversos: ["Tos seca", "Mareos", "Hipotensión"],
    contraindicaciones: ["Embarazo", "Estenosis renal bilateral"],
    indicaciones: ["Hipertensión arterial", "Insuficiencia cardíaca"]
  },
  {
    id: "2",
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
    id: "3",
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  
  let resultados = medicamentosMock
  
  if (q) {
    const queryLower = q.toLowerCase()
    resultados = medicamentosMock.filter(med => 
      med.nombre.toLowerCase().includes(queryLower) || 
      med.principioActivo.toLowerCase().includes(queryLower)
    )
  }
  
  return NextResponse.json(resultados)
}