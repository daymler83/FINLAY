'use client'
import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { X, Scale, Search, Lock, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchJsonWithTimeout } from '@/lib/fetchJson'

interface Medicamento {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  precioReferencia?: number | null
  vidaMedia?: string | null
  nivelInteracciones?: string | null
  efectosAdversos?: string[]
  contraindicaciones?: string[]
  indicaciones?: string[]
}

const FILAS = [
  { label: 'Principio activo', key: 'principioActivo' as keyof Medicamento },
  { label: 'Familia',          key: 'familia'         as keyof Medicamento },
  { label: 'Presentación',     key: 'presentacion'    as keyof Medicamento },
  { label: 'Laboratorio',      key: 'laboratorio'     as keyof Medicamento },
  { label: 'Vida media',       key: 'vidaMedia'       as keyof Medicamento },
]

const interaccionesStyle: Record<string, string> = {
  Pocas:     'text-green-600',
  Moderadas: 'text-orange-500',
  Muchas:    'text-red-600',
}

function AutocompleteSearch({ onAdd, disabledIds }: { onAdd: (med: Medicamento) => void; disabledIds: string[] }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useSWR<{ medicamentos: Medicamento[] }>(
    term.length >= 2 ? `/api/medicamentos?q=${encodeURIComponent(term)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )
  const results = data?.medicamentos ?? []
  const available = results.filter(m => !disabledIds.includes(m.id))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
          type="text"
          value={term}
          onChange={e => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar y agregar fármaco..."
          className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && term.length >= 2 && available.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {available.map(med => (
            <button
              key={med.id}
              onMouseDown={() => { onAdd(med); setTerm(''); setOpen(false) }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-medium text-gray-900 truncate">{med.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{med.principioActivo}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CompareContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isPro = user?.isPro ?? false
  const maxComparar = isPro ? 5 : 2

  const idsParam = searchParams.get('ids') ?? ''
  const addParam = searchParams.get('add') ?? ''
  const initialIds = idsParam
    ? idsParam.split(',').filter(Boolean).slice(0, maxComparar)
    : addParam ? [addParam] : []

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [addedCache, setAddedCache] = useState<Record<string, Medicamento>>({})
  const initialKey = initialIds.length > 0 ? `compare:${initialIds.join(',')}` : null

  const { data: initialData } = useSWR<Medicamento[]>(
    initialKey,
    async () => {
      const results = await Promise.all(
        initialIds.map(id => fetchJsonWithTimeout<Medicamento>(`/api/medicamentos/${id}`))
      )
      return results.filter((r): r is Medicamento => !('error' in r))
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )

  const initialCache = useMemo(() => {
    if (!initialData) return {}
    return Object.fromEntries(initialData.map((m: Medicamento) => [m.id, m]))
  }, [initialData])

  const handleAdd = useCallback((med: Medicamento) => {
    if (selectedIds.length >= maxComparar || selectedIds.includes(med.id)) return
    setSelectedIds(prev => [...prev, med.id])
    setAddedCache(prev => ({ ...prev, [med.id]: med }))
  }, [selectedIds, maxComparar])

  const handleRemove = (id: string) => setSelectedIds(prev => prev.filter(i => i !== id))

  const cache = { ...initialCache, ...addedCache }
  const seleccionados = selectedIds.map(id => cache[id]).filter(Boolean)
  const cols = seleccionados.length

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <Scale size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Comparar fármacos</h1>
        <Link href="/" className="ml-auto text-sm text-blue-600 hover:underline">← Volver al listado</Link>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 font-medium">
            Selecciona hasta {maxComparar} fármacos
            {!isPro && <span className="ml-1.5 text-xs text-blue-500">(Pro: hasta 5)</span>}
          </p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cols >= maxComparar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {cols}/{maxComparar}
          </span>
        </div>

        {seleccionados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {seleccionados.map(med => (
              <span key={med.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100">
                {med.nombre}
                <button onClick={() => handleRemove(med.id)} aria-label="Quitar">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {cols < maxComparar && (
          <AutocompleteSearch onAdd={handleAdd} disabledIds={selectedIds} />
        )}

        {/* Upsell si es free y llegó al límite */}
        {!isPro && cols >= 2 && (
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-blue-500" />
              <p className="text-xs text-blue-600">Pro permite comparar hasta 5 fármacos</p>
            </div>
            <Link href="/pro" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
              <Zap size={11} /> Pro
            </Link>
          </div>
        )}
      </div>

      {/* Mensaje menos de 2 */}
      {cols < 2 && (
        <div className="text-center py-14 text-gray-400">
          <Scale size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {cols === 0 ? 'Agrega al menos 2 fármacos para comparar' : 'Agrega un fármaco más para comenzar'}
          </p>
        </div>
      )}

      {/* Tabla */}
      {cols >= 2 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[360px] bg-white rounded-2xl border border-gray-200 shadow-sm text-sm overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 sticky left-0 bg-gray-50">
                  Campo
                </th>
                {seleccionados.map(med => (
                  <th key={med.id} className="p-3 text-left min-w-[160px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-xs leading-snug">{med.nombre}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{med.principioActivo}</p>
                      </div>
                      <button onClick={() => handleRemove(med.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS.map(({ label, key }) => (
                <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">{label}</td>
                  {seleccionados.map(med => (
                    <td key={med.id} className="p-3 text-xs text-gray-700">
                      {(med[key] as string) || <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Precio */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">Precio ref.</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 text-xs font-semibold text-gray-800">
                    {med.precioReferencia ? `$${med.precioReferencia.toLocaleString('es-CL')}` : <span className="text-gray-300 font-normal">—</span>}
                  </td>
                ))}
              </tr>

              {/* Interacciones */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">Interacciones</td>
                {seleccionados.map(med => (
                  <td key={med.id} className={`p-3 text-xs font-semibold ${interaccionesStyle[med.nivelInteracciones ?? ''] ?? 'text-gray-800'}`}>
                    {med.nivelInteracciones ?? <span className="text-gray-300 font-normal">—</span>}
                  </td>
                ))}
              </tr>

              {/* Efectos adversos */}
              <tr className="border-b border-gray-100">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white align-top">Ef. adversos</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 align-top">
                    {med.efectosAdversos?.length ? (
                      <ul className="space-y-1">
                        {med.efectosAdversos.slice(0, 3).map((ef, i) => (
                          <li key={i} className="text-[11px] text-orange-700 flex gap-1"><span>•</span>{ef}</li>
                        ))}
                        {med.efectosAdversos.length > 3 && (
                          <li className="text-[10px] text-gray-400">+{med.efectosAdversos.length - 3} más</li>
                        )}
                      </ul>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                ))}
              </tr>

              {/* Contraindicaciones */}
              <tr>
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white align-top">Contraind.</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 align-top">
                    {med.contraindicaciones?.length ? (
                      <ul className="space-y-1">
                        {med.contraindicaciones.slice(0, 3).map((ci, i) => (
                          <li key={i} className="text-[11px] text-red-700 flex gap-1"><span>•</span>{ci}</li>
                        ))}
                        {med.contraindicaciones.length > 3 && (
                          <li className="text-[10px] text-gray-400">+{med.contraindicaciones.length - 3} más</li>
                        )}
                      </ul>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {cols >= 2 && (
        <div className="flex flex-wrap gap-3">
          {seleccionados.map(med => (
            <Link key={med.id} href={`/medicamentos/${med.id}`} className="text-xs text-blue-600 hover:underline">
              Ver detalle de {med.nombre} →
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

async function fetcher(url: string): Promise<{ medicamentos: Medicamento[] }> {
  return fetchJsonWithTimeout<{ medicamentos: Medicamento[] }>(url)
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  )
}
