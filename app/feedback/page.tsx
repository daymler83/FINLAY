'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { MessageSquareText, Send, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type FeedbackType = 'bug' | 'idea' | 'content' | 'ux' | 'general'

export default function FeedbackPage() {
  const { user, isLoading } = useAuth()
  const [form, setForm] = useState({
    type: 'general' as FeedbackType,
    rating: 5,
    title: '',
    message: '',
    email: user?.email ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'No se pudo enviar el feedback')
        return
      }

      setSent(true)
      setForm({ type: 'general', rating: 5, title: '', message: '', email: user?.email ?? '' })
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <MessageSquareText size={14} />
          Feedback
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-blue-200">FINLAY</p>
        <h1 className="mt-2 text-3xl font-bold">Cuéntanos qué mejorar</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200">
          Esta versión está pensada para que médicos y colegas prueben la app y nos digan
          qué falta, qué confunde y qué valoraría de verdad en consulta.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Qué intentabas hacer', 'Buscamos contexto real de uso.'],
          ['Qué faltó', 'Nos ayuda a priorizar contenido y flujo.'],
          ['Qué sí funcionó', 'Nos indica qué mantener tal como está.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-1 text-sm text-gray-500">{body}</p>
          </div>
        ))}
      </div>

      {sent ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-600" />
          <h2 className="mt-3 text-xl font-semibold text-green-900">Gracias por tu feedback</h2>
          <p className="mt-2 text-sm text-green-700">
            Tu comentario fue registrado. Nos sirve mucho para la próxima iteración.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Enviar otro
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Tipo de feedback</span>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as FeedbackType })}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="general">General</option>
                <option value="bug">Error o bug</option>
                <option value="idea">Idea o mejora</option>
                <option value="content">Contenido médico</option>
                <option value="ux">Experiencia de uso</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Valoración general</span>
              <select
                value={form.rating}
                onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {[5, 4, 3, 2, 1].map(value => (
                  <option key={value} value={value}>{value} / 5</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-gray-700">Email de contacto</span>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="opcional@correo.cl"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-gray-700">Título breve</span>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: No encontré interacciones entre..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-gray-700">Tu comentario</span>
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder={user ? `Hola ${user.nombre ?? user.email}, cuéntanos tu experiencia...` : 'Cuéntanos tu experiencia...'}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Tu feedback se guardará para revisar prioridades del producto.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
              {loading ? 'Enviando...' : 'Enviar feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
