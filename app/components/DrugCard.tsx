import Link from 'next/link'
import { Pill, DollarSign } from 'lucide-react'

interface DrugCardProps {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  precioReferencia: number | null
  farmacia: string | null
}

export default function DrugCard({ id, nombre, principioActivo, presentacion, precioReferencia, farmacia }: DrugCardProps) {
  return (
    <Link href={`/medicamentos/${id}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Pill size={20} className="text-blue-600" />
              <h3 className="font-semibold text-lg">{nombre}</h3>
            </div>
            <p className="text-gray-600 text-sm mt-1">{principioActivo}</p>
            <p className="text-gray-500 text-xs mt-1">{presentacion}</p>
          </div>
          {precioReferencia && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-700">
                <DollarSign size={16} />
                <span className="font-bold">${precioReferencia.toLocaleString()}</span>
              </div>
              {farmacia && <p className="text-xs text-gray-400">{farmacia}</p>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}