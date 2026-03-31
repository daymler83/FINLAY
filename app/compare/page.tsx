'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

// Datos mock para el comparador
const medicamentosMock = [
  { id: "1", nombre: "Enalapril 20mg", principioActivo: "Enalapril", presentacion: "Comprimido 20mg", precioReferencia: 4500, familia: "IECA", efectosAdversos: ["Tos seca", "Mareos"] },
  { id: "2", nombre: "Losartán 50mg", principioActivo: "Losartán", presentacion: "Comprimido 50mg", precioReferencia: 8900, familia: "ARA-II", efectosAdversos: ["Mareos", "Fatiga"] },
  { id: "3", nombre: "Amlodipino 5mg", principioActivo: "Amlodipino", presentacion: "Comprimido 5mg", precioReferencia: 7200, familia: "Bloqueador calcio", efectosAdversos: ["Edema tobillos", "Rubor"] },
]

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const medicamentosFiltrados = medicamentosMock.filter(med =>
    med.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedIds.includes(med.id)
  )
  
  const medicamentosSeleccionados = medicamentosMock.filter(med =>
    selectedIds.includes(med.id)
  )
  
  const handleAdd = (id: string) => {
    if (selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id])
    }
  }
  
  const handleRemove = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id))
  }
  
  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-xl font-bold">Comparador de fármacos</h1>
      
      {/* Selección */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <p className="text-sm text-gray-600 mb-3">
          Selecciona hasta 3 fármacos para comparar ({selectedIds.length}/3)
        </p>
        
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 rounded-lg border border-gray-200 mb-3"
        />
        
        <div className="space-y-2">
          {medicamentosFiltrados.map(med => (
            <button
              key={med.id}
              onClick={() => handleAdd(med.id)}
              disabled={selectedIds.length >= 3}
              className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              {med.nombre} - {med.principioActivo}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tabla comparativa */}
      {medicamentosSeleccionados.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl border border-gray-200 text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 text-left">Característica</th>
                {medicamentosSeleccionados.map(med => (
                  <th key={med.id} className="p-3 text-left min-w-[150px]">
                    {med.nombre}
                    <button
                      onClick={() => handleRemove(med.id)}
                      className="ml-2 text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Principio activo</td>
                {medicamentosSeleccionados.map(med => (
                  <td key={med.id} className="p-3">{med.principioActivo}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Presentación</td>
                {medicamentosSeleccionados.map(med => (
                  <td key={med.id} className="p-3">{med.presentacion}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Precio</td>
                {medicamentosSeleccionados.map(med => (
                  <td key={med.id} className="p-3">
                    {med.precioReferencia ? `$${med.precioReferencia.toLocaleString()}` : 'N/D'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 font-medium">Familia</td>
                {medicamentosSeleccionados.map(med => (
                  <td key={med.id} className="p-3">{med.familia}</td>
                ))}
              </tr>
              <tr>
                <td className="p-3 font-medium">Efectos adversos</td>
                {medicamentosSeleccionados.map(med => (
                  <td key={med.id} className="p-3">
                    <ul className="list-disc list-inside text-red-600">
                      {med.efectosAdversos?.map(e => (
                        <li key={e} className="text-xs">{e}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}