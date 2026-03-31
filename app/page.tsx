'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import SearchBar from './components/SearchBar'
import DrugCard from './components/DrugCard'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const [query, setQuery] = useState('')
  const [isClient, setIsClient] = useState(false)
  const { data: medicamentos, isLoading } = useSWR(
    query ? `/api/medicamentos?q=${encodeURIComponent(query)}` : '/api/medicamentos',
    fetcher
  )
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Mostrar un placeholder durante la hidratación
  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">FarmaChile</h1>
          <p className="text-gray-500 text-sm">Compara fármacos disponibles en Chile</p>
        </div>
        <div className="w-full">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre o principio activo..."
              className="w-full p-4 pl-12 rounded-xl border border-gray-200 bg-white"
              disabled
            />
          </div>
        </div>
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Cargando...</div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FarmaChile</h1>
        <p className="text-gray-500 text-sm">Compara fármacos disponibles en Chile</p>
      </div>
      
      <SearchBar onSearch={setQuery} />
      
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Cargando...</div>
        </div>
      )}
      
      {!isLoading && medicamentos?.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron medicamentos
        </div>
      )}
      
      {!isLoading && medicamentos && medicamentos.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Se encontraron {medicamentos.length} medicamentos</p>
          <div className="space-y-3">
            {medicamentos.map((med: any) => (
              <DrugCard key={med.id} {...med} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}