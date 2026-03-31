'use client'
import { useParams } from 'next/navigation'
import { Pill, DollarSign, AlertCircle, Info, Building } from 'lucide-react'

// Datos mock (en producción vendrán de la API)
const medicamentosMock: Record<string, any> = {
  "1": {
    id: "1",
    nombre: "Enalapril 20mg",
    principioActivo: "Enalapril",
    presentacion: "Comprimido 20mg",
    laboratorio: "Varios (genérico)",
    precioReferencia: 4500,
    farmacia: "Salcobrand",
    efectosAdversos: ["Tos seca", "Mareos", "Hipotensión"],
    contraindicaciones: ["Embarazo", "Estenosis renal bilateral"],
    indicaciones: ["Hipertensión arterial", "Insuficiencia cardíaca"]
  },
  "2": {
    id: "2",
    nombre: "Losartán 50mg",
    principioActivo: "Losartán",
    presentacion: "Comprimido 50mg",
    laboratorio: "Merck",
    precioReferencia: 8900,
    farmacia: "Cruz Verde",
    efectosAdversos: ["Mareos", "Fatiga", "Hiperkalemia"],
    contraindicaciones: ["Embarazo", "Insuficiencia hepática severa"],
    indicaciones: ["Hipertensión arterial", "Nefropatía diabética"]
  },
  "3": {
    id: "3",
    nombre: "Amlodipino 5mg",
    principioActivo: "Amlodipino",
    presentacion: "Comprimido 5mg",
    laboratorio: "Pfizer",
    precioReferencia: 7200,
    farmacia: "Ahumada",
    efectosAdversos: ["Edema de tobillos", "Rubor facial", "Palpitaciones"],
    contraindicaciones: ["Hipotensión severa", "Shock cardiogénico"],
    indicaciones: ["Hipertensión arterial", "Angina de pecho"]
  }
}

export default function DrugDetail() {
  const { id } = useParams()
  const med = medicamentosMock[id as string]
  
  if (!med) {
    return <div className="text-center py-8">Medicamento no encontrado</div>
  }
  
  return (
    <div className="space-y-4 pb-8">
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-3 rounded-full">
            <Pill className="text-blue-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{med.nombre}</h1>
            <p className="text-gray-600">{med.principioActivo}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-500 text-sm">Presentación</p>
            <p className="font-medium">{med.presentacion}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Laboratorio</p>
            <p className="font-medium">{med.laboratorio}</p>
          </div>
        </div>
        
        {med.precioReferencia && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="text-green-700" size={20} />
              <span className="text-green-700 font-bold text-xl">
                ${med.precioReferencia.toLocaleString()}
              </span>
            </div>
            <p className="text-green-600 text-sm">Precio referencial en {med.farmacia || "farmacias"}</p>
          </div>
        )}
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-500" />
            <h3 className="font-semibold">Efectos adversos</h3>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {med.efectosAdversos?.map((e: string) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info size={18} className="text-blue-500" />
            <h3 className="font-semibold">Contraindicaciones</h3>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {med.contraindicaciones?.map((c: string) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building size={18} className="text-gray-500" />
            <h3 className="font-semibold">Indicaciones</h3>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            {med.indicaciones?.map((i: string) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}