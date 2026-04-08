'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle, Lock, Zap, AlertTriangle, Ban,
  Star, Scale, Clock, Activity, FileText, Brain
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ProPage() {
  const { user, isLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/mercadopago/checkout', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar el pago con Mercado Pago')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Zap,           color: 'text-blue-500',   label: '500+ fármacos (vs 10 en free)' },
    { icon: Scale,         color: 'text-indigo-500',  label: 'Comparador hasta 5 fármacos' },
    { icon: AlertTriangle, color: 'text-orange-500',  label: 'Efectos adversos completos' },
    { icon: Ban,           color: 'text-red-500',     label: 'Contraindicaciones detalladas' },
    { icon: Star,          color: 'text-yellow-500',  label: 'Favoritos: guarda tus fármacos' },
    { icon: Clock,         color: 'text-purple-500',  label: 'Historial de búsquedas' },
    { icon: FileText,      color: 'text-green-500',   label: 'Exportar nota clínica' },
    { icon: Activity,      color: 'text-teal-500',    label: 'Nivel de interacciones' },
    { icon: Brain,         color: 'text-indigo-500',  label: 'Análisis clínico con IA' },
  ]

  if (isLoading) return null

  if (user?.isPro) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">¡Ya eres Pro!</h1>
        <p className="text-gray-500 max-w-xs">
          Tienes acceso completo a todos los fármacos, efectos adversos, contraindicaciones y más.
        </p>
        <Link href="/" className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors">
          Ir a buscar fármacos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto pb-20 space-y-6">
      {/* Hero */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
          <Zap size={14} /> FINLAY Pro
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Acceso completo</h1>
        <p className="text-gray-500">Para profesionales que necesitan información clínica completa</p>
      </div>

      {/* Precio */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white text-center">
        <p className="text-blue-200 text-sm mb-1">Pago único, sin suscripción</p>
        <div className="flex items-end justify-center gap-1">
          <span className="text-xl font-medium text-blue-200">US$</span>
          <span className="text-5xl font-bold">20</span>
        </div>
        <p className="text-blue-200 text-xs mt-2">Acceso de por vida · Una sola vez</p>
      </div>

      {/* Features */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Incluye</h2>
        {features.map(({ icon: Icon, color, label }, i) => (
          <div key={i} className="flex items-center gap-3">
            <Icon size={18} className={color} />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {/* Free vs Pro */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
          <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Función</div>
          <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Free</div>
          <div className="p-3 text-xs font-semibold text-blue-600 uppercase tracking-wide text-center">Pro</div>
        </div>
        {[
          ['Fármacos', '10', '500+'],
          ['Comparador', '2 fármacos', '5 fármacos'],
          ['Efectos adversos', '—', '✓'],
          ['Contraindicaciones', '—', '✓'],
          ['Favoritos', '—', '✓'],
          ['Historial', '—', '✓'],
          ['Nota clínica', '—', '✓'],
          ['Análisis clínico con IA', '—', '✓'],
        ].map(([label, free, pro]) => (
          <div key={label} className="grid grid-cols-3 border-b border-gray-100 last:border-0">
            <div className="p-3 text-xs text-gray-600">{label}</div>
            <div className="p-3 text-xs text-gray-400 text-center">{free}</div>
            <div className="p-3 text-xs text-blue-600 text-center font-medium">{pro}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!user ? (
        <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200">
          <Lock size={20} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">Debes iniciar sesión para continuar</p>
          <Link href="/login" className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors w-full text-center">
            Iniciar sesión
          </Link>
          <p className="text-xs text-gray-400 mt-2">
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-blue-600">Regístrate gratis</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3 text-center">{error}</p>
          )}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg"
          >
            {loading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Pago seguro con Mercado Pago. Al completarse, tu cuenta Pro se activa automáticamente.
          </p>
        </div>
      )}
    </div>
  )
}
