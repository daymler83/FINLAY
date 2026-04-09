'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle, Lock, Zap, AlertTriangle, Ban,
  Star, Scale, Clock, Activity, FileText, Brain,
  Check, Minus, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PRO_PLAN_LIST, type ProPlanKey } from '@/lib/proAccess'

const FREE_FEATURES = [
  '10 medicamentos visibles',
  'Comparador hasta 2 fármacos',
  'Búsqueda por nombre, principio activo y laboratorio',
]

const PRO_FEATURES = [
  { icon: Zap,           iconColor: 'text-blue-600',   bg: 'bg-blue-50',   label: '500+ fármacos' },
  { icon: Scale,         iconColor: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Comparador hasta 5 fármacos' },
  { icon: AlertTriangle, iconColor: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Efectos adversos completos' },
  { icon: Ban,           iconColor: 'text-red-600',    bg: 'bg-red-50',    label: 'Contraindicaciones detalladas' },
  { icon: Star,          iconColor: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Favoritos guardados' },
  { icon: Clock,         iconColor: 'text-purple-600', bg: 'bg-purple-50', label: 'Historial de búsquedas' },
  { icon: FileText,      iconColor: 'text-emerald-600',bg: 'bg-emerald-50',label: 'Exportar nota clínica' },
  { icon: Activity,      iconColor: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Nivel de interacciones' },
  { icon: Brain,         iconColor: 'text-violet-600', bg: 'bg-violet-50', label: 'Análisis clínico con IA' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(value: string | null) {
  if (!value) return 'Acceso de por vida'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Acceso de por vida'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long',
  }).format(date)
}

export default function ProPage() {
  const { user, isLoading } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<ProPlanKey | null>(null)
  const [error, setError] = useState('')

  const handleCheckout = async (plan: ProPlanKey) => {
    setError('')
    setLoadingPlan(plan)

    try {
      const res = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al procesar el pago con Mercado Pago')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoadingPlan(null)
    }
  }

  if (isLoading) return null

  if (user?.isPro) {
    return (
      <div className="max-w-2xl mx-auto pb-20 px-4 space-y-5">
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold mb-4 border border-emerald-100 uppercase tracking-wide">
            <CheckCircle size={11} /> Pro activo
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Tu acceso Pro está activo</h1>
          <p className="text-slate-500 text-sm">
            {user.proExpiresAt
              ? `Tu plan ${user.proPlan === 'annual' ? 'anual' : 'mensual'} vence el ${formatDate(user.proExpiresAt)}.`
              : 'Tienes acceso de por vida a FINLAY Pro.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Estado actual</p>
              <h2 className="text-xl font-bold text-slate-900">Ya puedes usar todo el catálogo y el análisis clínico</h2>
              <p className="text-sm text-slate-500 mt-2">
                Si quieres extender tu acceso antes del vencimiento, puedes renovar con mensual o anual.
              </p>
            </div>
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Ir a buscar fármacos <ArrowRight size={15} />
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-white text-slate-700 font-semibold px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Ir a comparar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4 space-y-6">
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold mb-4 border border-blue-100 uppercase tracking-wide">
          <Zap size={11} fill="currentColor" /> FINLAY Pro
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Planes para usar FINLAY</h1>
        <p className="text-slate-500 text-sm">
          Empieza gratis, o elige mensual o anual si quieres acceso completo por tiempo determinado.
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-xl p-3 text-center border border-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Freemium</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Gratis</h2>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Lock size={16} className="text-slate-500" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-4xl font-black tracking-tight text-slate-900">$0</p>
            <p className="text-sm text-slate-500 mt-1">Acceso básico permanente</p>
          </div>

          <ul className="mt-5 space-y-2.5">
            {FREE_FEATURES.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Seguir gratis
            </Link>
          </div>
        </article>

        {PRO_PLAN_LIST.map(plan => (
          <article
            key={plan.key}
            className={`relative rounded-3xl border shadow-sm p-6 flex flex-col ${
              plan.key === 'annual'
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200'
            }`}
          >
            {plan.key === 'annual' && (
              <div className="absolute right-5 top-5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80">
                Mejor ahorro
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest ${plan.key === 'annual' ? 'text-slate-400' : 'text-slate-400'}`}>
                  Pro {plan.label}
                </p>
                <h2 className={`mt-1 text-xl font-bold ${plan.key === 'annual' ? 'text-white' : 'text-slate-900'}`}>
                  {plan.label}
                </h2>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                plan.key === 'annual' ? 'bg-white/10' : 'bg-slate-100'
              }`}>
                <Zap size={16} className={plan.key === 'annual' ? 'text-white' : 'text-slate-500'} fill="currentColor" />
              </div>
            </div>

            <div className="mt-4">
              <p className={`text-4xl font-black tracking-tight ${plan.key === 'annual' ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(plan.priceClp)}
              </p>
              <p className={`text-sm mt-1 ${plan.key === 'annual' ? 'text-slate-300' : 'text-slate-500'}`}>
                {plan.subtitle}
              </p>
            </div>

            <ul className="mt-5 space-y-2.5">
              {PRO_FEATURES.slice(0, 5).map(feature => (
                <li
                  key={feature.label}
                  className={`flex items-start gap-2 text-sm ${
                    plan.key === 'annual' ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  <Check size={14} className={`mt-0.5 shrink-0 ${plan.key === 'annual' ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.key)}
              disabled={loadingPlan !== null}
              className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                plan.key === 'annual'
                  ? 'bg-white text-slate-900 hover:bg-slate-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {loadingPlan === plan.key ? 'Redirigiendo...' : `Elegir ${plan.label.toLowerCase()}`}
            </button>
            <p className={`mt-3 text-xs text-center ${plan.key === 'annual' ? 'text-slate-400' : 'text-slate-400'}`}>
              Pago único por {plan.durationDays} días, sin renovación automática.
            </p>
          </article>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Incluye Pro</p>
        <div className="grid gap-3 md:grid-cols-3">
          {PRO_FEATURES.map(({ icon: Icon, iconColor, bg, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={14} className={iconColor} />
              </div>
              <span className="text-sm text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5">
        <div className="grid grid-cols-3 border-b border-slate-200">
          <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Función</div>
          <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Freemium</div>
          <div className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Pro</div>
        </div>
        {[
          ['Fármacos', '10', '500+'],
          ['Comparador', '2 fármacos', '5 fármacos'],
          ['Efectos adversos', null, true],
          ['Contraindicaciones', null, true],
          ['Favoritos', null, true],
          ['Historial', null, true],
          ['Nota clínica', null, true],
          ['Análisis clínico IA', null, true],
        ].map(([label, free, pro]) => (
          <div key={String(label)} className="grid grid-cols-3 border-b border-slate-100 last:border-0">
            <div className="p-3 text-xs text-slate-600">{label}</div>
            <div className="p-3 text-center flex items-center justify-center">
              {free === null
                ? <Minus size={12} className="text-slate-300" />
                : <span className="text-xs font-medium text-slate-500">{free}</span>}
            </div>
            <div className="p-3 text-center flex items-center justify-center">
              {pro === true
                ? <Check size={13} className="text-blue-600" strokeWidth={2.5} />
                : <span className="text-xs font-bold text-blue-700">{pro}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 text-center border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Lock size={16} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-600">
          Pago seguro con Mercado Pago. Al completarse, tu cuenta se activa automáticamente por el período elegido.
        </p>
      </div>
    </div>
  )
}
