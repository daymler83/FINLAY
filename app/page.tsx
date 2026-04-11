'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import SearchBar from './components/SearchBar'
import DrugCard from './components/DrugCard'
import { DrugCardSkeleton } from './components/LoadingSkeleton'
import { Scale, Zap, ArrowRight } from 'lucide-react'
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

  const { data, isLoading, error, mutate } = useSWR<ApiResponse>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  })
  const medicamentos = (data?.medicamentos ?? []).filter(
    med => typeof med.precioReferencia === 'number' && med.precioReferencia > 0
  )
  const isPro = user?.isPro ?? data?.isPro ?? false
  const total = data?.total ?? medicamentos.length
  const limit = data?.limit ?? 10
  const maxComparar = isPro ? 5 : 2

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    void mutate()
  }, [user?.id, mutate])

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
        <h1 className="text-2xl font-bold text-slate-900 mb-2 sm:text-3xl tracking-tight">
          Busca y compara fármacos
        </h1>
        <p className="text-slate-500 text-[15px]">
          Nombres, principios activos, laboratorios e información clínica
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/feedback" className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
            Dejar feedback
          </Link>
          <Link href="/acerca-de" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Qué es FINLAY
          </Link>
        </div>
      </div>

      {/* Pro guidance */}
      {isPro && (
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Cómo usar Pro</p>
              <p className="text-xs text-slate-500 mt-0.5">Busca, filtra por grupo clínico y compara hasta 5 fármacos.</p>
            </div>
            <button
              onClick={() => scrollToSection('resultados')}
              className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
            >
              Ir a resultados
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { step: '1', title: 'Buscar', text: 'Nombre comercial o principio activo.' },
              { step: '2', title: 'Filtrar', text: 'Explora por grupo clínico.' },
              { step: '3', title: 'Comparar', text: 'Hasta 5 fármacos lado a lado.' },
            ].map(item => (
              <div key={item.step} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {item.step}
                  </span>
                  <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                </div>
                <p className="text-[11px] leading-4 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buscador + Comparar */}
      <div id="buscar" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 min-w-0">
          <SearchBar onSearch={handleSearch} />
        </div>
        <button
          onClick={handleComparar}
          disabled={seleccionados.length < 2}
          className={`shrink-0 flex items-center justify-center gap-2 font-semibold px-5 py-3.5 rounded-2xl border transition-all whitespace-nowrap w-full sm:w-auto ${
            seleccionados.length >= 2
              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-md'
              : 'bg-white text-slate-300 border-slate-200 cursor-not-allowed'
          }`}
        >
          Comparar
          {seleccionados.length >= 2 && (
            <span className="bg-white text-slate-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {seleccionados.length}
            </span>
          )}
          {seleccionados.length >= 2 && <ArrowRight size={15} />}
        </button>
      </div>

      {/* Filtros rápidos */}
      <div id="categorias" className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Explorar por grupo clínico
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTROS.map(({ label, categoria }) => (
            <button
              key={categoria}
              onClick={() => handleFiltro(categoria)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                categoriaActiva === categoria
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteo */}
      {!isLoading && !error && data && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Mostrando {medicamentos.length} medicamentos · Selecciona hasta {maxComparar}
          {seleccionados.length > 0 && (
            <span className="ml-3 text-blue-600 normal-case tracking-normal font-semibold text-xs">
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
          <p className="text-slate-400 text-sm">Error al cargar los fármacos</p>
        </div>
      )}

      {/* Sin resultados */}
      {!isLoading && !error && medicamentos.length === 0 && busqueda && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Scale size={22} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-600">Sin resultados para &quot;{busqueda}&quot;</p>
          <p className="text-sm text-slate-400 mt-1">Intenta con el nombre comercial, principio activo o laboratorio</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && medicamentos.length > 0 && (
        <div id="resultados" className="scroll-mt-24">
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
        </div>
      )}

      {/* Banner Pro */}
      {!isLoading && hayMas && !isPro && (
        <div className="relative overflow-hidden bg-slate-900 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-xl shadow-slate-200">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          <div className="relative">
            <p className="text-sm font-bold text-white">Más fármacos disponibles con Pro</p>
            <p className="text-xs text-slate-400 mt-0.5">Accede a toda la base de datos clínica</p>
          </div>
          <Link
            href="/pro"
            className="relative shrink-0 flex items-center gap-1.5 bg-white text-slate-900 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <Zap size={11} className="text-blue-600" fill="currentColor" /> Ver Pro
          </Link>
        </div>
      )}

      {/* Barra flotante de comparación */}
      {seleccionados.length >= 2 && (
        <div id="comparar" className="fixed bottom-20 left-0 right-0 flex justify-center z-30 px-4 md:bottom-6">
          <button
            onClick={handleComparar}
            className="flex items-center gap-3 bg-slate-900 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
          >
            <Scale size={17} />
            Comparar {seleccionados.length} fármacos
            <ArrowRight size={15} className="opacity-60" />
          </button>
        </div>
      )}
    </div>
  )
}

async function fetcher(url: string): Promise<ApiResponse> {
  return fetchJsonWithTimeout<ApiResponse>(url)
}
