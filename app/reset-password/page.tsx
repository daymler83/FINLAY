'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Pill, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password, confirmPassword }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'No pudimos actualizar tu contraseña')
      return
    }

    setMessage(data.message ?? 'Tu contraseña se actualizó correctamente')
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pill size={28} className="text-blue-600" />
            <span className="text-2xl font-bold text-gray-800">Farma<span className="text-blue-600">Chile</span></span>
          </div>
          <p className="text-gray-500 text-sm">Ingresa el código que recibiste por correo</p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de recuperación</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full p-3 rounded-lg border border-gray-200 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 pr-10"
                  placeholder="Repite la contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-lg p-3">{error}</p>
            )}

            {message && (
              <p className="text-green-700 text-sm bg-green-50 rounded-lg p-3">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/forgot-password" className="text-blue-600 font-medium hover:underline">
            Pedir un nuevo código
          </Link>
        </p>
      </div>
    </div>
  )
}
