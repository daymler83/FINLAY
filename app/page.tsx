'use client'
import { useState } from 'react'
import useSWR from 'swr'
import SearchBar from './components/SearchBar'
import DrugCard from './components/DrugCard'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const [query, setQuery] = useState('')
  const { data: medicamentos, isLoading } = useSWR(
    query ? `/api/medicamentos?q=${encodeURIComponent(query)}` : null,
    fetcher
  )
  
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">FarmaChile</h1>
        <p className="text-gray-500 text-sm">Compara fármacos disponibles en Chile</p>
      </div>
      
      <SearchBar onSearch={setQuery} />
      
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-400">Buscando...</div>
        </div>
      )}
      
      {medicamentos?.length === 0 && query && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron medicamentos para "{query}"
        </div>
      )}
      
      <div className="space-y-3">
        {medicamentos?.map((med: any) => (
          <DrugCard key={med.id} {...med} />
        ))}
      </div>
    </div>
  )
}