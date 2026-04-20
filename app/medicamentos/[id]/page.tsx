'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import {
  ArrowLeft, Pill, AlertTriangle, Ban, CheckCircle,
  Lock, Star, Scale, Building2, Cross, Clock, Activity, FileText
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Badge from '@/app/components/Badge'
import { DetailSkeleton } from '@/app/components/LoadingSkeleton'
import { getClinicalCategoryLabel, type ClinicalCategory } from '@/lib/clinicalCategory'
import { fetchJsonWithTimeout } from '@/lib/fetchJson'

interface MedicamentoDetalleResponse {
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
  efectosAdversos: string[]
  contraindicaciones: string[]
  indicaciones: string[]
  categoriaClinica?: ClinicalCategory
  error?: string
}

function detectGenerico(nombre: string, principioActivo: string): boolean {
  return nombre.toLowerCase().startsWith(principioActivo.toLowerCase().split(' ')[0])
}

export default function MedicamentoDetalle() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [favorito, setFavorito] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  const { data: med, isLoading, error } = useSWR<MedicamentoDetalleResponse>(
    id ? `/api/medicamentos/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )

  // Check if already favorito
  const { data: favs } = useSWR(
    user ? '/api/favoritos' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )
  useEffect(() => {
    if (favs && Array.isArray(favs)) {
      setFavorito(favs.some((f: { id: string }) => f.id === id))
    }
  }, [favs, id])

  const handleFavorito = async () => {
    if (!user) { router.push('/login'); return }
    setFavLoading(true)
    try {
      if (favorito) {
        await fetch(`/api/favoritos/${id}`, { method: 'DELETE' })
        setFavorito(false)
      } else {
        await fetch('/api/favoritos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medicamentoId: id }),
        })
        setFavorito(true)
      }
    } finally {
      setFavLoading(false)
    }
  }

  const handleExportarNota = () => {
    if (!med) return
    const lineas = [
      `NOTA CLÍNICA — FINLAY`,
      ``,
      `Medicamento: ${med.nombre}`,
      `Principio activo: ${med.principioActivo}`,
      `Familia: ${med.familia}`,
      `Laboratorio: ${med.laboratorio}`,
      med.registroIsp ? `Registro ISP: ${med.registroIsp}` : '',
      med.estadoRegistroIsp ? `Estado ISP: ${med.estadoRegistroIsp}` : '',
      `Presentación: ${med.presentacion}`,
      med.vidaMedia ? `Vida media: ${med.vidaMedia}` : '',
      med.nivelInteracciones ? `Nivel de interacciones: ${med.nivelInteracciones}` : '',
      med.precioReferencia ? `Precio referencia: $${med.precioReferencia.toLocaleString('es-CL')} CLP` : '',
      ``,
      med.indicaciones?.length ? `INDICACIONES:\n${med.indicaciones.map((i: string) => `• ${i}`).join('\n')}` : '',
      ``,
      med.efectosAdversos?.length ? `EFECTOS ADVERSOS:\n${med.efectosAdversos.map((e: string) => `• ${e}`).join('\n')}` : '',
      ``,
      med.contraindicaciones?.length ? `CONTRAINDICACIONES:\n${med.contraindicaciones.map((c: string) => `• ${c}`).join('\n')}` : '',
      ``,
      `Generado por FINLAY — ${new Date().toLocaleDateString('es-CL')}`,
    ].filter(l => l !== undefined && l !== null)

    const texto = lineas.join('\n')
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nota-${med.nombre.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <DetailSkeleton />

  if (error || !med || med.error) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 font-medium">Medicamento no encontrado</p>
        <button onClick={() => router.back()} className="text-blue-600 text-sm mt-2">
          ← Volver
        </button>
      </div>
    )
  }

  const isGenerico = detectGenerico(med.nombre, med.principioActivo)

  return (
    <div className="space-y-4 pb-28">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] px-1"
        >
          <ArrowLeft size={18} /> <span className="text-sm">Volver</span>
        </button>
        <button
          onClick={handleFavorito}
          disabled={favLoading}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors ${
            favorito ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
          }`}
          aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Star size={22} fill={favorito ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Card principal */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Pill size={22} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-snug">{med.nombre}</h1>
            <p className="text-gray-500 text-sm mt-1">{med.principioActivo}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {med.familia && (
            <Badge variant="blue">{med.familia}</Badge>
          )}
          {med.categoriaClinica && med.categoriaClinica !== 'otros' && (
            <Badge variant="gray">{getClinicalCategoryLabel(med.categoriaClinica)}</Badge>
          )}
          {med.laboratorio && (
            <Badge variant="metal">
              <Building2 size={11} className="mr-1" />{med.laboratorio}
            </Badge>
          )}
          <Badge variant={isGenerico ? 'green' : 'purple'}>
            {isGenerico ? 'Genérico' : 'Marca'}
          </Badge>
        </div>

        {/* Grid de datos rápidos */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {med.presentacion && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Presentación</p>
              <p className="text-sm font-semibold text-gray-800">{med.presentacion}</p>
            </div>
          )}
          {med.precioReferencia && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Precio ref.</p>
              <p className="text-sm font-semibold text-gray-800">${med.precioReferencia.toLocaleString('es-CL')}</p>
            </div>
          )}
          {med.vidaMedia && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
              <Clock size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Vida media</p>
                <p className="text-sm font-semibold text-gray-800">{med.vidaMedia}</p>
              </div>
            </div>
          )}
          {med.registroIsp && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Registro ISP</p>
              <p className="text-sm font-semibold text-gray-800">{med.registroIsp}</p>
              {med.estadoRegistroIsp && (
                <p className="text-[11px] text-gray-500 mt-0.5">{med.estadoRegistroIsp}</p>
              )}
            </div>
          )}
          {med.titularRegistroIsp && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Titular ISP</p>
              <p className="text-sm font-semibold text-gray-800">{med.titularRegistroIsp}</p>
            </div>
          )}
          {med.nivelInteracciones && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2">
              <Activity size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide mb-1">Interacciones</p>
                <p className={`text-sm font-semibold ${
                  med.nivelInteracciones === 'Pocas' ? 'text-green-600'
                  : med.nivelInteracciones === 'Muchas' ? 'text-red-600'
                  : 'text-orange-500'
                }`}>{med.nivelInteracciones}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Indicaciones */}
      {med.indicaciones?.length > 0 && (
        <section className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={15} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Indicaciones</h2>
          </div>
          <ul className="space-y-2">
            {med.indicaciones.map((ind: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-500 font-bold mt-0.5 shrink-0">•</span>
                <span>{ind}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Efectos adversos + Contraindicaciones: solo Pro */}
      {user?.isPro ? (
        <>
          {med.efectosAdversos?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={15} className="text-orange-500" />
                </div>
                <h2 className="font-semibold text-gray-800">Efectos adversos</h2>
              </div>
              <ul className="space-y-2">
                {med.efectosAdversos.map((ef: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-400 font-bold mt-0.5 shrink-0">•</span>
                    <span>{ef}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {med.contraindicaciones?.length > 0 && (
            <section className="bg-white rounded-2xl p-4 border border-red-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                  <Ban size={15} className="text-red-500" />
                </div>
                <h2 className="font-semibold text-gray-800">Contraindicaciones</h2>
              </div>
              <ul className="space-y-2">
                {med.contraindicaciones.map((ci: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-red-400 font-bold mt-0.5 shrink-0">•</span>
                    <span>{ci}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Exportar nota clínica */}
          <button
            onClick={handleExportarNota}
            className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-medium py-3.5 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[52px] shadow-sm"
          >
            <FileText size={18} className="text-green-600" />
            Exportar nota clínica
          </button>
        </>
      ) : (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={18} className="text-blue-600" />
            <h2 className="font-semibold text-blue-800">Contenido exclusivo Pro</h2>
          </div>
          <p className="text-sm text-blue-600 mb-4">
            Accede a efectos adversos, contraindicaciones y exportar nota clínica. Elige un plan mensual o anual según tu uso.
          </p>
          <Link
            href={user ? '/pro' : '/login'}
            className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors min-h-[44px]"
          >
            <Cross size={14} />
            {user ? 'Ver planes Pro' : 'Iniciar sesión para continuar'}
          </Link>
        </section>
      )}

      {/* Botón comparar */}
      <Link
        href={`/compare?add=${id}`}
        className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-medium py-3.5 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[52px] shadow-sm"
      >
        <Scale size={18} className="text-blue-600" />
        Comparar con otro fármaco
      </Link>
    </div>
  )
}

async function fetcher(url: string): Promise<MedicamentoDetalleResponse> {
  return fetchJsonWithTimeout<MedicamentoDetalleResponse>(url)
}
