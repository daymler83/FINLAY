'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import SearchBar from './components/SearchBar'
import DrugCard from './components/DrugCard'
import { DrugCardSkeleton } from './components/LoadingSkeleton'
import { Scale, Zap, Lock } from 'lucide-react'
import { fetchJsonWithTimeout } from '@/lib/fetchJson'
import { useAuth } from '@/hooks/useAuth'

const FILTROS = [
  { label: 'Antihipertensivos', categoria: 'antihipertensivo' },
  { label: 'Antidiabéticos',    categoria: 'antidiabético' },
  { label: 'AINES',             categoria: 'aine' },
  { label: 'Antibióticos',      categoria: 'antibiótico' },
  { label: 'Estatinas',         categoria: 'estatina' },
]

interface Medicamento {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  precioReferencia: number | null
  vidaMedia: string | null
  nivelInteracciones: string | null
}

interface ApiResponse {
  medicamentos: Medicamento[]
  total: number
  isPro: boolean
  limit: number
}

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])

  const filtroEtiqueta = FILTROS.find(f => f.categoria === categoriaActiva)?.label ?? ''
  const busqueda = query || filtroEtiqueta
  const url = query
    ? `/api/medicamentos?q=${encodeURIComponent(query)}`
    : categoriaActiva
      ? `/api/medicamentos?categoria=${encodeURIComponent(categoriaActiva)}`
      : '/api/medicamentos'

  const { data, isLoading, error } = useSWR<ApiResponse>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  })
  const medicamentos = data?.medicamentos ?? []
  const isPro = user?.isPro ?? data?.isPro ?? false
  const total = data?.total ?? 0
  const limit = data?.limit ?? 10
  const maxComparar = isPro ? 5 : 2

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    setCategoriaActiva('')
    setSeleccionados([])
  }, [])

  const handleFiltro = (categoria: string) => {
    setCategoriaActiva(prev => prev === categoria ? '' : categoria)
    setQuery('')
    setSeleccionados([])
  }

  const handleToggle = (id: string) => {
    setSeleccionados(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : prev.length < maxComparar ? [...prev, id] : prev
    )
  }

  const handleComparar = () => {
    if (seleccionados.length >= 2) {
      router.push(`/compare?ids=${seleccionados.join(',')}`)
    }
  }

  const hayMas = total > limit

  return (
    <div className="space-y-6 pb-28">
      {/* Hero */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Comparador de medicamentos
        </h1>
        <p className="text-gray-500 text-base">
          Compara principios activos, presentaciones y más información clínica
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/feedback" className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            Dejar feedback
          </Link>
          <Link href="/acerca-de" className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Qué es FINLAY
          </Link>
        </div>
      </div>

      {/* Buscador + Comparar */}
      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <SearchBar onSearch={handleSearch} />
        </div>
        <button
          onClick={handleComparar}
          disabled={seleccionados.length < 2}
          className={`shrink-0 flex items-center gap-2 font-semibold px-5 py-3.5 rounded-2xl border transition-all whitespace-nowrap ${
            seleccionados.length >= 2
              ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800 shadow-sm'
              : 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          Comparar
          {seleccionados.length >= 2 && (
            <span className="bg-white text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {seleccionados.length}
            </span>
          )}
          <span className="text-sm">↗</span>
        </button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTROS.map(({ label, categoria }) => (
          <button
            key={categoria}
            onClick={() => handleFiltro(categoria)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              categoriaActiva === categoria
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteo */}
      {!isLoading && !error && data && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Mostrando {medicamentos.length} medicamentos · Selecciona hasta {maxComparar}
          {seleccionados.length > 0 && (
            <span className="ml-3 text-blue-600 normal-case tracking-normal font-medium">
              {seleccionados.length} seleccionado{seleccionados.length > 1 ? 's' : ''}
              {seleccionados.length < 2 && ' — selecciona al menos 2 para comparar'}
            </span>
          )}
        </p>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <DrugCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Error al cargar los fármacos</p>
        </div>
      )}

      {/* Sin resultados */}
      {!isLoading && !error && medicamentos.length === 0 && busqueda && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Scale size={22} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-500">Sin resultados para &quot;{busqueda}&quot;</p>
          <p className="text-sm text-gray-400 mt-1">Intenta con el nombre comercial o principio activo</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && medicamentos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medicamentos.map(med => (
            <DrugCard
              key={med.id}
              {...med}
              selected={seleccionados.includes(med.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Banner Pro — más resultados disponibles */}
      {!isLoading && hayMas && !isPro && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Lock size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Más fármacos disponibles con Pro</p>
              <p className="text-xs text-blue-500">Accede a toda la base de datos</p>
            </div>
          </div>
          <Link
            href="/pro"
            className="shrink-0 flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Zap size={12} /> Ver Pro
          </Link>
        </div>
      )}

      {/* Barra flotante de comparación */}
      {seleccionados.length >= 2 && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30 px-4 md:bottom-6">
          <button
            onClick={handleComparar}
            className="flex items-center gap-3 bg-gray-900 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-xl hover:bg-gray-800 transition-all"
          >
            <Scale size={18} />
            Comparar {seleccionados.length} fármacos
            <span className="text-sm opacity-70">↗</span>
          </button>
        </div>
      )}
    </div>
  )
}

async function fetcher(url: string): Promise<ApiResponse> {
  return fetchJsonWithTimeout<ApiResponse>(url)
}
