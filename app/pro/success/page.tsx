'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ProSuccessPage() {
  const { mutate } = useAuth()

  useEffect(() => {
    // Revalidar sesión para reflejar isPro = true
    mutate()
  }, [mutate])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle size={40} className="text-green-600" />
      </div>

      <div>
        <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
          <Zap size={14} /> FarmaChile Pro activado
        </div>
        <h1 className="text-2xl font-bold text-gray-900">¡Pago exitoso!</h1>
        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
          Tu cuenta Pro ha sido activada. Ya tienes acceso completo a efectos adversos y contraindicaciones.
        </p>
      </div>

      <Link
        href="/"
        className="inline-block bg-blue-600 text-white font-medium px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
      >
        Empezar a usar FarmaChile Pro
      </Link>
    </div>
  )
}
