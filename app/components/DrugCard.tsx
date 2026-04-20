'use client'
import Link from 'next/link'
import Badge from './Badge'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { getClinicalCategoryLabel, type ClinicalCategory } from '@/lib/clinicalCategory'

interface DrugCardProps {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  registroIsp?: string | null
  estadoRegistroIsp?: string | null
  categoriaClinica?: ClinicalCategory
  precioReferencia?: number | null
  vidaMedia?: string | null
  nivelInteracciones?: string | null
  selected?: boolean
  expanded?: boolean
  onToggle?: (id: string) => void
  onExpand?: (id: string) => void
}

function detectGenerico(nombre: string, principioActivo: string) {
  return nombre.toLowerCase().startsWith(principioActivo.toLowerCase().split(' ')[0])
}

const interaccionesColor: Record<string, string> = {
  Pocas:     'text-emerald-600',
  Moderadas: 'text-amber-600',
  Muchas:    'text-red-600',
}

export default function DrugCard({
  id, nombre, principioActivo, presentacion, familia, laboratorio, categoriaClinica,
  registroIsp, estadoRegistroIsp, precioReferencia, vidaMedia, nivelInteracciones,
  selected = false, expanded = false, onToggle, onExpand,
}: DrugCardProps) {
  const isGenerico = detectGenerico(nombre, principioActivo)
  const familiaPartes = familia ? familia.split('·').map(s => s.trim()) : []

  return (
    <div className={`relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
      selected
        ? 'border-blue-300 shadow-md shadow-blue-50'
        : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
    }`}>
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200 ${
        selected ? 'bg-blue-500' : 'bg-transparent'
      }`} />

      {/* Header colapsado — siempre visible */}
      <div
        className="px-4 py-3.5 flex items-center gap-3 cursor-pointer select-none"
        onClick={() => onExpand?.(id)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant={isGenerico ? 'green' : 'purple'} size="xs">
              {isGenerico ? 'Genérico' : 'Marca'}
            </Badge>
            {categoriaClinica && categoriaClinica !== 'otros' && (
              <Badge variant="gray" size="xs">
                {getClinicalCategoryLabel(categoriaClinica)}
              </Badge>
            )}
          </div>
          <Link
            href={`/medicamentos/${id}`}
            onClick={e => e.stopPropagation()}
            className="font-bold text-blue-600 hover:underline text-[15px] leading-snug truncate block"
          >
            {nombre}
          </Link>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="truncate">{principioActivo}</span>
            {laboratorio && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-500 shrink-0">
                {laboratorio}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {precioReferencia ? (
            <span className="text-sm font-bold text-slate-800 tabular-nums">
              ${precioReferencia.toLocaleString('es-CL')}
            </span>
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )}

          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <ChevronDown
              size={13}
              className={`text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>

          {onToggle && (
            <button
              onClick={e => { e.stopPropagation(); onToggle(id) }}
              aria-label={selected ? 'Deseleccionar' : 'Seleccionar para comparar'}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-slate-300 hover:border-blue-400'
              }`}
            >
              {selected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Detalle expandido */}
      <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
        expanded ? 'max-h-72 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3">
          {familia && (
            <p className="text-xs text-blue-600 font-medium">{familiaPartes.join(' · ')}</p>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presentación</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5 leading-snug">{presentacion}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio ref.</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {precioReferencia
                  ? `$${precioReferencia.toLocaleString('es-CL')}`
                  : <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vida media</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {vidaMedia ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interacciones</dt>
              <dd className={`text-sm font-bold mt-0.5 ${interaccionesColor[nivelInteracciones ?? ''] ?? 'text-slate-300'}`}>
                {nivelInteracciones ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registro ISP</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {registroIsp ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado ISP</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {estadoRegistroIsp ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>
          </dl>

          <Link
            href={`/medicamentos/${id}`}
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
          >
            Ver ficha completa <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}
