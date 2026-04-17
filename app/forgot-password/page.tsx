'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Pill } from 'lucide-react'

const REQUEST_TIMEOUT_MS = 10000

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [delivery, setDelivery] = useState<'smtp' | 'console' | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setDelivery(null)
    setLoading(true)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'No pudimos procesar la solicitud')
        return
      }

      setMessage((data as { message?: string }).message ?? 'Revisa tu correo para continuar.')
      setDelivery((data as { delivery?: 'smtp' | 'console' | null }).delivery ?? null)
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'La solicitud tardó demasiado. Intenta nuevamente.'
        : 'No pudimos conectar con el servidor. Intenta nuevamente.'
      setError(message)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pill size={28} className="text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">Farma<span className="text-blue-600">Chile</span></span>
          </div>
          <p className="text-gray-500 text-sm">Te enviamos un código para restablecer tu contraseña</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="doctor@clinica.cl"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
            )}

            {message && (
              <div className="space-y-2">
                <p className="text-green-700 text-sm bg-green-50 rounded-lg p-3">{message}</p>
                {delivery === 'console' && (
                  <p className="text-amber-700 text-sm bg-amber-50 rounded-lg p-3">
                    No hay SMTP configurado en este entorno. El código quedó en la consola del servidor.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/reset-password" className="text-blue-600 font-medium hover:underline">
            Ya tengo mi código
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500 mt-2">
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
