import Link from 'next/link'
import Badge from './Badge'
import { getClinicalCategoryLabel, type ClinicalCategory } from '@/lib/clinicalCategory'

interface DrugCardProps {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  categoriaClinica?: ClinicalCategory
  precioReferencia?: number | null
  vidaMedia?: string | null
  nivelInteracciones?: string | null
  selected?: boolean
  onToggle?: (id: string) => void
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
  precioReferencia, vidaMedia, nivelInteracciones,
  selected = false, onToggle,
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

      <div className="px-4 py-4">
        {/* Top row: badges + checkbox */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={isGenerico ? 'green' : 'purple'} size="xs">
              {isGenerico ? 'Genérico' : 'Marca'}
            </Badge>
            {categoriaClinica && categoriaClinica !== 'otros' && (
              <Badge variant="gray" size="xs">
                {getClinicalCategoryLabel(categoriaClinica)}
              </Badge>
            )}
          </div>
          {onToggle && (
            <button
              onClick={() => onToggle(id)}
              aria-label={selected ? 'Deseleccionar' : 'Seleccionar para comparar'}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
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

        {/* Name block */}
        <Link href={`/medicamentos/${id}`} className="block group">
          <h3 className="font-bold text-slate-900 text-[15px] leading-snug group-hover:text-blue-600 transition-colors">
            {nombre}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{principioActivo}</p>

          {familia && (
            <p className="text-xs text-blue-600 mt-1.5 font-medium">
              {familiaPartes.join(' · ')}
              {laboratorio && (
                <span className="ml-1 inline-flex items-center rounded-full border border-slate-400 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  {laboratorio}
                </span>
              )}
            </p>
          )}

          {/* Data grid */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 pt-3 border-t border-slate-100">
            <div>
              <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Presentación</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5 leading-snug">{presentacion}</dd>
            </div>

            <div>
              <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Precio ref.</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {precioReferencia
                  ? `$${precioReferencia.toLocaleString('es-CL')}`
                  : <span className="text-slate-300">—</span>}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vida media</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">
                {vidaMedia ?? <span className="text-slate-300">—</span>}
              </dd>
            </div>

            <div>
              <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Interacciones</dt>
              <dd className={`text-sm font-semibold mt-0.5 ${interaccionesColor[nivelInteracciones ?? ''] ?? 'text-slate-300'}`}>
                {nivelInteracciones ?? '—'}
              </dd>
            </div>
          </dl>
        </Link>
      </div>
    </div>
  )
}
