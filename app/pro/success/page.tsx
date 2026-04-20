'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ProSuccessPage() {
  const { user, mutate } = useAuth()
  const [verifying, setVerifying] = useState(true)
  const [plan] = useState(() =>
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('plan')
  )

  useEffect(() => {
    let alive = true
    let attempts = 0
    const maxAttempts = 10

    const poll = async () => {
      while (alive && attempts < maxAttempts) {
        attempts += 1
        const result = await mutate()
        if (result?.user?.isPro) {
          if (!alive) return
          setVerifying(false)
          return
        }

        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      if (alive) setVerifying(false)
    }

    void poll()

    return () => {
      alive = false
    }
  }, [mutate])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle size={40} className="text-green-600" />
      </div>

      <div>
        <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
          <Zap size={14} /> {user?.isPro ? 'FINLAY Pro activo' : 'Verificando activación...'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.isPro ? `¡Suscripción ${plan === 'annual' ? 'anual' : 'mensual'} activada!` : 'Procesando tu activación'}
        </h1>
        <p className="text-gray-500 mt-2 max-w-xs mx-auto">
          {verifying
            ? 'Estamos confirmando el pago con Mercado Pago. Esto puede tardar unos segundos.'
            : user?.isPro
            ? `Tu suscripción está activa${user.proExpiresAt ? ` y el próximo cobro será el ${new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(new Date(user.proExpiresAt))}` : ''}. Ya tienes acceso completo.`
            : 'Todavía no pudimos confirmar tu cuenta Pro. Espera un momento y vuelve a intentar.'}
        </p>
      </div>

      <Link
        href="/"
        className="inline-block bg-blue-600 text-white font-medium px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors"
      >
        {user?.isPro ? 'Empezar a usar FINLAY Pro' : 'Volver al inicio'}
      </Link>
    </div>
  )
}
