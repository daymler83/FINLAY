'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { Star, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import DrugCard from '@/app/components/DrugCard'
import { DrugCardSkeleton } from '@/app/components/LoadingSkeleton'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

export default function FavoritosPage() {
  const { user, isLoading: authLoading } = useAuth()

  const { data: favoritos, isLoading } = useSWR<Medicamento[]>(
    user ? '/api/favoritos' : null,
    fetcher
  )

  if (authLoading) return null

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Lock size={28} className="text-gray-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Inicia sesión para ver tus favoritos</h1>
        <Link href="/login" className="bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <Star size={20} className="text-yellow-500" fill="currentColor" />
        <h1 className="text-xl font-bold text-gray-900">Favoritos</h1>
        <Link href="/" className="ml-auto text-sm text-blue-600 hover:underline">← Volver</Link>
      </div>

      {/* Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <DrugCardSkeleton key={i} />)}
        </div>
      )}

      {/* Sin favoritos */}
      {!isLoading && (!favoritos || favoritos.length === 0) && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star size={22} className="text-gray-300" />
          </div>
          <p className="font-medium text-gray-500">Aún no tienes favoritos</p>
          <p className="text-sm text-gray-400 mt-1">
            Toca la estrella ★ en cualquier fármaco para guardarlo aquí
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Explorar fármacos →
          </Link>
        </div>
      )}

      {/* Grid */}
      {!isLoading && favoritos && favoritos.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            {favoritos.length} fármaco{favoritos.length > 1 ? 's' : ''} guardado{favoritos.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favoritos.map(med => (
              <DrugCard
                key={med.id}
                {...med}
                selected={false}
                onToggle={() => {}}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
