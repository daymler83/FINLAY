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

const interaccionesStyle: Record<string, string> = {
  Pocas:     'text-green-600',
  Moderadas: 'text-orange-500',
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
    <div className={`bg-white rounded-2xl p-4 border transition-all duration-150 ${
      selected
        ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
        : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
    }`}>
      {/* Top row: badge + checkbox */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
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
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              selected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 hover:border-blue-400'
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

      {/* Name + principio activo */}
      <Link href={`/medicamentos/${id}`} className="block group">
        <h3 className="font-bold text-gray-900 text-[15px] leading-snug group-hover:text-blue-700 transition-colors">
          {nombre}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">{principioActivo}</p>

        {/* Familia */}
        {familia && (
          <p className="text-xs text-blue-600 mt-1.5">
            {familiaPartes.join(' · ')}
            {laboratorio && <span className="text-gray-400"> · {laboratorio}</span>}
          </p>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">Presentación</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">{presentacion}</p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">Precio ref.</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {precioReferencia
                ? `$${precioReferencia.toLocaleString('es-CL')}`
                : <span className="text-gray-300 font-normal text-xs">No disponible</span>}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">Vida media</p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5">
              {vidaMedia ?? <span className="text-gray-300 font-normal text-xs">—</span>}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">Interacciones</p>
            <p className={`text-sm font-semibold mt-0.5 ${interaccionesStyle[nivelInteracciones ?? ''] ?? 'text-gray-800'}`}>
              {nivelInteracciones ?? <span className="text-gray-300 font-normal text-xs">—</span>}
            </p>
          </div>
        </div>
      </Link>
    </div>
  )
}
