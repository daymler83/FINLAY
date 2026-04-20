'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import SearchBar from './components/SearchBar'
import DrugCard from './components/DrugCard'
import { DrugCardSkeleton } from './components/LoadingSkeleton'
import { Scale, Zap, ArrowRight, Bot, BookOpen, CalendarDays, FlaskConical } from 'lucide-react'
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
  registroIsp: string | null
  estadoRegistroIsp: string | null
  titularRegistroIsp: string | null
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

function LandingPage() {
  const features = [
    {
      icon: <Bot size={20} className="text-white" />,
      bg: 'bg-slate-900',
      title: 'Asistente IA',
      desc: 'Consulta dosis, interacciones y contraindicaciones en lenguaje natural. Respuestas clínicas en segundos.',
    },
    {
      icon: <Scale size={20} className="text-white" />,
      bg: 'bg-blue-600',
      title: 'Comparador clínico',
      desc: 'Compara hasta 5 fármacos lado a lado. Análisis automatizado con IA para apoyar tu decisión terapéutica.',
    },
    {
      icon: <BookOpen size={20} className="text-white" />,
      bg: 'bg-indigo-600',
      title: 'Papers académicos',
      desc: 'Busca en PubMed y accede a abstracts científicos sin salir de la plataforma.',
    },
    {
      icon: <CalendarDays size={20} className="text-white" />,
      bg: 'bg-violet-600',
      title: 'Eventos farmacológicos',
      desc: 'Calendario actualizado automáticamente con congresos, conferencias y webinars del área.',
    },
  ]

  return (
    <div className="pb-28 space-y-16">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-14 sm:py-20 text-center shadow-2xl">
        {/* Dot grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-200 mb-6">
            <FlaskConical size={12} />
            Plataforma clínica · Chile
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight max-w-2xl mx-auto">
            La primera plataforma que compara tus fármacos con inteligencia clínica
          </h1>

          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
            Catálogo de medicamentos chilenos, asistente IA, búsqueda de papers y eventos farmacológicos. Todo en un solo lugar, pensado para profesionales de salud.
          </p>

          <p className="mt-6 text-[11px] text-slate-400">
            Acceso gratuito hasta el 5 de mayo · Sin tarjeta requerida
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-6">
          Todo lo que necesitas en una sola plataforma
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map(f => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-slate-900 text-[15px] mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-center">
        <p className="font-bold text-slate-900">¿Eres profesional de salud?</p>
        <p className="text-sm text-slate-500 mt-1">Regístrate arriba y accede gratis hasta el 5 de mayo.</p>
      </section>

    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [query, setQuery] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const handleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

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

  // Show landing page for unauthenticated users
  if (!authLoading && !user) {
    return <LandingPage />
  }

  // While checking auth, show nothing to avoid flash
  if (authLoading) {
    return <div className="min-h-[60vh]" />
  }

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
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-200/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-slate-300/20 blur-3xl" />
          {!user ? (
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="text-center lg:text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Bienvenido a FINLAY</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Tu asistente clínico para decidir mejor, más rápido.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Regístrate para activar tu prueba de 5 días con tarjeta en Mercado Pago y acceder al catálogo completo, comparador y análisis clínico.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    Crear cuenta <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Qué incluye</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    10k+ fármacos y fichas clínicas
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Comparador clínico de hasta 5 medicamentos
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Análisis con IA y exportación para consulta
                  </p>
                </div>
                <Link
                  href="/acerca-de"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                >
                  Conocer FINLAY <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ) : !isPro ? (
            <div className="relative text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                <Zap size={11} fill="currentColor" />
                Acceso Pro requerido
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Activa tu prueba de 5 días</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Para ver medicamentos necesitas una suscripción activa. Puedes comenzar hoy con tarjeta y cancelar cuando quieras desde Mercado Pago.
              </p>
              <div className="mt-6">
                <Link
                  href="/pro"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <Zap size={14} fill="currentColor" />
                  Ver planes y activar prueba
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-slate-400 text-sm">No pudimos cargar los fármacos en este momento. Intenta nuevamente en unos segundos.</p>
            </div>
          )}
        </section>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {medicamentos.map(med => (
              <DrugCard
                key={med.id}
                {...med}
                selected={seleccionados.includes(med.id)}
                expanded={expandedId === med.id}
                onToggle={handleToggle}
                onExpand={handleExpand}
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
