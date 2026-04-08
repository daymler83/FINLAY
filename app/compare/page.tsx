'use client'
import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { X, Scale, Search, Lock, Zap, Brain, Download, Save, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchJsonWithTimeout } from '@/lib/fetchJson'
import { buildSimplePdfBytes } from '@/lib/simplePdf'

interface Medicamento {
  id: string
  nombre: string
  principioActivo: string
  presentacion: string
  familia: string
  laboratorio: string
  precioReferencia?: number | null
  vidaMedia?: string | null
  nivelInteracciones?: string | null
  efectosAdversos?: string[]
  contraindicaciones?: string[]
  indicaciones?: string[]
}

interface PatientProfile {
  age: string
  weight: string
  renalFunction: string
  hepaticFunction: string
  pregnancy: string
  lactation: string
  clinicalContext: string
}

interface ComparisonInsightMedication {
  medicationId: string
  profileFit?: {
    label?: string
    reasons?: string[]
  }
  evidence?: {
    level?: string
    summary?: string
    guidelineSupport?: string
  }
  adverseEffects?: {
    common?: string[]
    severity?: string
    visualSummary?: string
  }
  posology?: {
    route?: string
    frequency?: string
    comfort?: string
    notes?: string
  }
  onset?: string | null
  pregnancy?: string
  lactation?: string
  cost?: {
    referencePriceClp?: number | null
    dailyEstimateClp?: string | null
    comment?: string
  }
}

interface ComparisonInsights {
  summary?: string
  profileSummary?: string
  bestMatch?: {
    medicationId?: string | null
    reason?: string
  }
  medications?: ComparisonInsightMedication[]
  urgentSubstitution?: {
    summary?: string
    alternatives?: Array<{
      fromMedicationId?: string | null
      toMedicationId?: string | null
      reason?: string
    }>
  }
}

interface SavedComparison {
  id: string
  label: string
  createdAt: string
  ids: string[]
  profile: PatientProfile
}

const FILAS = [
  { label: 'Principio activo', key: 'principioActivo' as keyof Medicamento },
  { label: 'Familia',          key: 'familia'         as keyof Medicamento },
  { label: 'Presentación',     key: 'presentacion'    as keyof Medicamento },
  { label: 'Laboratorio',      key: 'laboratorio'     as keyof Medicamento },
  { label: 'Vida media',       key: 'vidaMedia'       as keyof Medicamento },
]

const interaccionesStyle: Record<string, string> = {
  Pocas:     'text-green-600',
  Moderadas: 'text-orange-500',
  Muchas:    'text-red-600',
}

function AutocompleteSearch({ onAdd, disabledIds }: { onAdd: (med: Medicamento) => void; disabledIds: string[] }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useSWR<{ medicamentos: Medicamento[] }>(
    term.length >= 2 ? `/api/medicamentos?q=${encodeURIComponent(term)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )
  const results = data?.medicamentos ?? []
  const available = results.filter(m => !disabledIds.includes(m.id))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
          type="text"
          value={term}
          onChange={e => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar y agregar fármaco..."
          className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {open && term.length >= 2 && available.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {available.map(med => (
            <button
              key={med.id}
              onMouseDown={() => { onAdd(med); setTerm(''); setOpen(false) }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <p className="text-sm font-medium text-gray-900 truncate">{med.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{med.principioActivo}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CompareContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isPro = user?.isPro ?? false
  const maxComparar = isPro ? 5 : 2

  const idsParam = searchParams.get('ids') ?? ''
  const addParam = searchParams.get('add') ?? ''
  const initialIds = idsParam
    ? idsParam.split(',').filter(Boolean).slice(0, maxComparar)
    : addParam ? [addParam] : []

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [addedCache, setAddedCache] = useState<Record<string, Medicamento>>({})
  const [profile, setProfile] = useState<PatientProfile>({
    age: '',
    weight: '',
    renalFunction: 'No informado',
    hepaticFunction: 'No informado',
    pregnancy: 'No informado',
    lactation: 'No informado',
    clinicalContext: '',
  })
  const [insights, setInsights] = useState<ComparisonInsights | null>(null)
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState('')
  const [comparisonLabel, setComparisonLabel] = useState('')
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([])
  const initialKey = initialIds.length > 0 ? `compare:${initialIds.join(',')}` : null

  const { data: initialData } = useSWR<Medicamento[]>(
    initialKey,
    async () => {
      const results = await Promise.all(
        initialIds.map(id => fetchJsonWithTimeout<Medicamento>(`/api/medicamentos/${id}`))
      )
      return results.filter((r): r is Medicamento => !('error' in r))
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  )

  const initialCache = useMemo(() => {
    if (!initialData) return {}
    return Object.fromEntries(initialData.map((m: Medicamento) => [m.id, m]))
  }, [initialData])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('finlay:saved-comparisons')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setSavedComparisons(parsed)
      }
    } catch {
      setSavedComparisons([])
    }
  }, [])

  const handleAdd = useCallback((med: Medicamento) => {
    if (selectedIds.length >= maxComparar || selectedIds.includes(med.id)) return
    setSelectedIds(prev => [...prev, med.id])
    setAddedCache(prev => ({ ...prev, [med.id]: med }))
    setInsights(null)
    setInsightsError('')
  }, [selectedIds, maxComparar])

  const handleRemove = (id: string) => {
    setSelectedIds(prev => prev.filter(i => i !== id))
    setInsights(null)
    setInsightsError('')
  }

  const persistSavedComparisons = useCallback((next: SavedComparison[]) => {
    setSavedComparisons(next)
    try {
      window.localStorage.setItem('finlay:saved-comparisons', JSON.stringify(next))
    } catch {
      // Silencioso: si localStorage no está disponible, seguimos sin bloquear la UI.
    }
  }, [])

  const handleSaveComparison = useCallback(() => {
    if (selectedIds.length < 2) return
    const label = comparisonLabel.trim() || `Comparación ${new Date().toLocaleDateString('es-CL')}`
    const next: SavedComparison = {
      id: crypto.randomUUID(),
      label,
      createdAt: new Date().toISOString(),
      ids: selectedIds,
      profile,
    }
    persistSavedComparisons([next, ...savedComparisons].slice(0, 12))
  }, [selectedIds, comparisonLabel, persistSavedComparisons, profile, savedComparisons])

  const handleLoadSavedComparison = useCallback((saved: SavedComparison) => {
    setSelectedIds(saved.ids.slice(0, maxComparar))
    setProfile(saved.profile)
    setComparisonLabel(saved.label)
    setInsights(null)
    setInsightsError('')
  }, [maxComparar])

  const generateComparisonInsights = useCallback(async () => {
    if (selectedIds.length < 2) return
    setIsGeneratingInsights(true)
    setInsightsError('')

    try {
      const response = await fetch('/api/compare/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationIds: selectedIds,
          patientProfile: profile,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo generar el análisis')
      }

      setInsights(data)
    } catch (error) {
      setInsights(null)
      setInsightsError(error instanceof Error ? error.message : 'No se pudo generar el análisis')
    } finally {
      setIsGeneratingInsights(false)
    }
  }, [profile, selectedIds])

  const cache = useMemo(() => ({ ...initialCache, ...addedCache }), [initialCache, addedCache])
  const seleccionados = useMemo(
    () => selectedIds.map(id => cache[id]).filter(Boolean),
    [selectedIds, cache]
  )
  const cols = seleccionados.length

  const handleExportPdf = useCallback(() => {
    if (seleccionados.length < 2) return

    const insightMap = new Map((insights?.medications ?? []).map(item => [item.medicationId, item]))
    const lines: string[] = []

    lines.push('Comparacion clinica FINLAY')
    lines.push(`Fecha: ${new Date().toLocaleDateString('es-CL')}`)
    if (comparisonLabel.trim()) lines.push(`Etiqueta: ${comparisonLabel.trim()}`)
    lines.push('')
    lines.push('Perfil del paciente')
    lines.push(`Edad: ${profile.age || 'No informada'}`)
    lines.push(`Peso: ${profile.weight || 'No informado'}`)
    lines.push(`Funcion renal: ${profile.renalFunction || 'No informado'}`)
    lines.push(`Funcion hepatica: ${profile.hepaticFunction || 'No informado'}`)
    lines.push(`Embarazo: ${profile.pregnancy || 'No informado'}`)
    lines.push(`Lactancia: ${profile.lactation || 'No informado'}`)
    if (profile.clinicalContext.trim()) lines.push(`Contexto: ${profile.clinicalContext.trim()}`)
    lines.push('')

    if (insights?.summary) {
      lines.push('Resumen')
      lines.push(insights.summary)
      lines.push('')
    }

    seleccionados.forEach(med => {
      const item = insightMap.get(med.id)
      lines.push(med.nombre)
      lines.push(`Principio activo: ${med.principioActivo}`)
      if (item?.profileFit?.label) lines.push(`Perfil: ${item.profileFit.label}`)
      if (item?.profileFit?.reasons?.length) {
        item.profileFit.reasons.forEach(reason => lines.push(`- ${reason}`))
      }
      if (item?.evidence?.level) lines.push(`Evidencia: ${item.evidence.level}`)
      if (item?.evidence?.summary) lines.push(`Evidencia resumen: ${item.evidence.summary}`)
      if (item?.posology?.route) lines.push(`Via: ${item.posology.route}`)
      if (item?.posology?.frequency) lines.push(`Frecuencia: ${item.posology.frequency}`)
      if (item?.onset) lines.push(`Inicio de efecto: ${item.onset}`)
      if (item?.pregnancy) lines.push(`Embarazo: ${item.pregnancy}`)
      if (item?.lactation) lines.push(`Lactancia: ${item.lactation}`)
      if (item?.cost?.referencePriceClp) lines.push(`Precio referencia: $${item.cost.referencePriceClp.toLocaleString('es-CL')} CLP`)
      if (item?.cost?.dailyEstimateClp) lines.push(`Costo estimado diario: ${item.cost.dailyEstimateClp}`)
      lines.push('')
    })

    if (insights?.urgentSubstitution?.summary) {
      lines.push('Sustitucion urgente')
      lines.push(insights.urgentSubstitution.summary)
      lines.push('')
    }

    const pdfBytes = buildSimplePdfBytes({
      title: 'Comparacion clinica FINLAY',
      subtitle: 'Exportado para ficha clinica',
      lines,
    })

    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comparacion-${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }, [comparisonLabel, insights, profile, seleccionados])

  useEffect(() => {
    const missingIds = selectedIds.filter(id => !cache[id])
    if (missingIds.length === 0) return

    let cancelled = false

    Promise.all(
      missingIds.map(id => fetchJsonWithTimeout<Medicamento>(`/api/medicamentos/${id}`))
    ).then(results => {
      if (cancelled) return

      const next = results.reduce((acc, result) => {
        if (!('error' in result)) {
          acc[result.id] = result
        }
        return acc
      }, {} as Record<string, Medicamento>)

      if (Object.keys(next).length > 0) {
        setAddedCache(prev => ({ ...prev, ...next }))
      }
    }).catch(() => {
      // Silencioso: si falta un medicamento guardado, simplemente no se muestra.
    })

    return () => {
      cancelled = true
    }
  }, [cache, selectedIds])

  useEffect(() => {
    if (!comparisonLabel && seleccionados.length > 0) {
      setComparisonLabel(seleccionados.map(m => m.nombre).join(' vs ').slice(0, 60))
    }
  }, [comparisonLabel, seleccionados])

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
        <Scale size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Comparar fármacos</h1>
        <Link href="/" className="sm:ml-auto text-sm text-blue-600 hover:underline">← Volver al listado</Link>
      </div>

      {/* Selector */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 font-medium">
            Selecciona hasta {maxComparar} fármacos
            {!isPro && <span className="ml-1.5 text-xs text-blue-500">(Pro: hasta 5)</span>}
          </p>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cols >= maxComparar ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {cols}/{maxComparar}
          </span>
        </div>

        {seleccionados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {seleccionados.map(med => (
              <span key={med.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-100">
                {med.nombre}
                <button onClick={() => handleRemove(med.id)} aria-label="Quitar">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {cols < maxComparar && (
          <AutocompleteSearch onAdd={handleAdd} disabledIds={selectedIds} />
        )}

        {/* Upsell si es free y llegó al límite */}
        {!isPro && cols >= 2 && (
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-blue-500" />
              <p className="text-xs text-blue-600">Pro permite comparar hasta 5 fármacos</p>
            </div>
            <Link href="/pro" className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline">
              <Zap size={11} /> Pro
            </Link>
          </div>
        )}
      </div>

      {/* Mensaje menos de 2 */}
      {cols < 2 && (
        <div className="text-center py-14 text-gray-400">
          <Scale size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {cols === 0 ? 'Agrega al menos 2 fármacos para comparar' : 'Agrega un fármaco más para comenzar'}
          </p>
        </div>
      )}

      {!isPro && cols >= 2 && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-blue-100 shrink-0">
              <Brain size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-blue-900">Vista previa del análisis clínico</h2>
              <p className="mt-1 text-sm text-blue-700">
                En Pro se genera un análisis con perfil del paciente, evidencia, embarazo/lactancia, posología y PDF.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Perfil</p>
              <p className="mt-1 text-sm text-gray-700">Ajuste por edad, función renal/hepática y contexto clínico.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Seguridad</p>
              <p className="mt-1 text-sm text-gray-700">Embarazo, lactancia, efectos adversos y sustitución urgente.</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Salida</p>
              <p className="mt-1 text-sm text-gray-700">Resumen clínico y exportación PDF para ficha o justificación.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-blue-500" />
              <p className="text-sm text-blue-700">Estas funciones están disponibles en Pro.</p>
            </div>
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Zap size={14} />
              Ver Pro
            </Link>
          </div>
        </section>
      )}

      {isPro && cols >= 2 && (
        <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <UserRound size={18} className="mt-0.5 text-blue-600" />
              <div>
                <h2 className="font-semibold text-gray-900">Perfil del paciente</h2>
                <p className="text-xs text-gray-500">Usa estos datos para afinar la comparación médica con IA.</p>
              </div>
            </div>
            <button
              onClick={handleSaveComparison}
              className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors"
            >
              <Save size={12} />
              Guardar comparación
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Etiqueta</span>
              <input
                value={comparisonLabel}
                onChange={e => setComparisonLabel(e.target.value)}
                placeholder="Ej: HTA en adulto mayor"
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Edad</span>
              <input
                value={profile.age}
                onChange={e => setProfile(prev => ({ ...prev, age: e.target.value }))}
                type="number"
                min="0"
                placeholder="Ej: 72"
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Peso</span>
              <input
                value={profile.weight}
                onChange={e => setProfile(prev => ({ ...prev, weight: e.target.value }))}
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 68"
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Función renal</span>
              <select
                value={profile.renalFunction}
                onChange={e => setProfile(prev => ({ ...prev, renalFunction: e.target.value }))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>No informado</option>
                <option>Normal</option>
                <option>Leve deterioro</option>
                <option>Moderado</option>
                <option>Severo</option>
                <option>Diálisis</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Función hepática</span>
              <select
                value={profile.hepaticFunction}
                onChange={e => setProfile(prev => ({ ...prev, hepaticFunction: e.target.value }))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>No informado</option>
                <option>Normal</option>
                <option>Leve deterioro</option>
                <option>Moderado</option>
                <option>Severo</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Embarazo</span>
              <select
                value={profile.pregnancy}
                onChange={e => setProfile(prev => ({ ...prev, pregnancy: e.target.value }))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>No informado</option>
                <option>No</option>
                <option>Sí</option>
                <option>Semana 1-13</option>
                <option>Semana 14-27</option>
                <option>Semana 28-40</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Lactancia</span>
              <select
                value={profile.lactation}
                onChange={e => setProfile(prev => ({ ...prev, lactation: e.target.value }))}
                className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>No informado</option>
                <option>No</option>
                <option>Sí</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contexto clínico</span>
            <textarea
              value={profile.clinicalContext}
              onChange={e => setProfile(prev => ({ ...prev, clinicalContext: e.target.value }))}
              placeholder="Ej: paciente con HTA y tos con IECA, busca alternativa de mejor tolerancia."
              className="w-full min-h-[88px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generateComparisonInsights}
              disabled={isGeneratingInsights || cols < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <Brain size={16} />
              {isGeneratingInsights ? 'Analizando...' : 'Generar análisis clínico'}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={cols < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <Download size={16} className="text-blue-600" />
              Exportar PDF
            </button>
          </div>

          {savedComparisons.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Comparaciones guardadas</p>
              <div className="flex flex-wrap gap-2">
                {savedComparisons.map(saved => (
                  <button
                    key={saved.id}
                    onClick={() => handleLoadSavedComparison(saved)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    {saved.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {insightsError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {insightsError}
        </div>
      )}

      {isPro && insights?.summary && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-blue-600" />
            <h2 className="font-semibold text-blue-900">Análisis clínico</h2>
          </div>
          <p className="text-sm leading-6 text-blue-900/90">{insights.summary}</p>
          {insights.profileSummary && (
            <p className="text-sm leading-6 text-blue-800">{insights.profileSummary}</p>
          )}
          {insights.bestMatch?.reason && (
            <div className="rounded-xl border border-blue-100 bg-white/80 p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Mejor ajuste sugerido</p>
              <p className="mt-1 text-gray-700">{insights.bestMatch.reason}</p>
            </div>
          )}
        </section>
      )}

      {isPro && (insights?.medications?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Comparación clínica por fármaco</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {seleccionados.map(med => {
              const insight = insights?.medications?.find(item => item.medicationId === med.id)
              if (!insight) return null

              return (
                <article key={med.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{med.nombre}</p>
                      <p className="text-xs text-gray-500">{med.principioActivo}</p>
                    </div>
                    {insight.profileFit?.label && (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        insight.profileFit.label === 'Preferible'
                          ? 'bg-green-50 text-green-700'
                          : insight.profileFit.label === 'Evitar'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {insight.profileFit.label}
                      </span>
                    )}
                  </div>

                  {insight.profileFit?.reasons?.length ? (
                    <ul className="space-y-1 text-xs text-gray-600">
                      {insight.profileFit.reasons.map((reason, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 text-blue-500">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Evidencia</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{insight.evidence?.level ?? '—'}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">{insight.evidence?.summary ?? 'Sin resumen disponible'}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Vía y posología</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {insight.posology?.route ?? '—'} · {insight.posology?.frequency ?? '—'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">{insight.posology?.notes ?? 'Sin nota de posología'}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Efectos adversos</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{insight.adverseEffects?.severity ?? '—'}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">{insight.adverseEffects?.visualSummary ?? 'Sin resumen visual'}</p>
                      {insight.adverseEffects?.common?.length ? (
                        <p className="mt-2 text-[11px] text-orange-700">{insight.adverseEffects.common.slice(0, 3).join(' · ')}</p>
                      ) : null}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Embarazo y lactancia</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800">{insight.pregnancy ?? '—'} / {insight.lactation ?? '—'}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        Inicio de efecto: {insight.onset ?? 'no definido'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-blue-500">Costo</p>
                    <p className="mt-1 text-sm font-semibold text-blue-900">
                      {insight.cost?.referencePriceClp
                        ? `$${insight.cost.referencePriceClp.toLocaleString('es-CL')} CLP`
                        : 'Sin precio de referencia'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">{insight.cost?.comment ?? 'Sin comentario de costo'}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {isPro && insights?.urgentSubstitution?.summary && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-600" />
            <h2 className="font-semibold text-amber-900">Modo sustitución urgente</h2>
          </div>
          <p className="text-sm leading-6 text-amber-900/90">{insights.urgentSubstitution.summary}</p>
        </section>
      )}

      {/* Tabla */}
      {cols >= 2 && (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[360px] bg-white rounded-2xl border border-gray-200 shadow-sm text-sm overflow-hidden">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 sticky left-0 bg-gray-50">
                  Campo
                </th>
                {seleccionados.map(med => (
                  <th key={med.id} className="p-3 text-left min-w-[160px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-xs leading-snug">{med.nombre}</p>
                        <p className="text-gray-400 text-[10px] mt-0.5">{med.principioActivo}</p>
                      </div>
                      <button onClick={() => handleRemove(med.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS.map(({ label, key }) => (
                <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">{label}</td>
                  {seleccionados.map(med => (
                    <td key={med.id} className="p-3 text-xs text-gray-700">
                      {(med[key] as string) || <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Precio */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">Precio ref.</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 text-xs font-semibold text-gray-800">
                    {med.precioReferencia ? `$${med.precioReferencia.toLocaleString('es-CL')}` : <span className="text-gray-300 font-normal">—</span>}
                  </td>
                ))}
              </tr>

              {/* Interacciones */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white">Interacciones</td>
                {seleccionados.map(med => (
                  <td key={med.id} className={`p-3 text-xs font-semibold ${interaccionesStyle[med.nivelInteracciones ?? ''] ?? 'text-gray-800'}`}>
                    {med.nivelInteracciones ?? <span className="text-gray-300 font-normal">—</span>}
                  </td>
                ))}
              </tr>

              {/* Efectos adversos */}
              <tr className="border-b border-gray-100">
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white align-top">Ef. adversos</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 align-top">
                    {med.efectosAdversos?.length ? (
                      <ul className="space-y-1">
                        {med.efectosAdversos.slice(0, 3).map((ef, i) => (
                          <li key={i} className="text-[11px] text-orange-700 flex gap-1"><span>•</span>{ef}</li>
                        ))}
                        {med.efectosAdversos.length > 3 && (
                          <li className="text-[10px] text-gray-400">+{med.efectosAdversos.length - 3} más</li>
                        )}
                      </ul>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                ))}
              </tr>

              {/* Contraindicaciones */}
              <tr>
                <td className="p-3 text-xs font-medium text-gray-400 sticky left-0 bg-white align-top">Contraind.</td>
                {seleccionados.map(med => (
                  <td key={med.id} className="p-3 align-top">
                    {med.contraindicaciones?.length ? (
                      <ul className="space-y-1">
                        {med.contraindicaciones.slice(0, 3).map((ci, i) => (
                          <li key={i} className="text-[11px] text-red-700 flex gap-1"><span>•</span>{ci}</li>
                        ))}
                        {med.contraindicaciones.length > 3 && (
                          <li className="text-[10px] text-gray-400">+{med.contraindicaciones.length - 3} más</li>
                        )}
                      </ul>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {cols >= 2 && (
        <div className="flex flex-wrap gap-3">
          {seleccionados.map(med => (
            <Link key={med.id} href={`/medicamentos/${med.id}`} className="text-xs text-blue-600 hover:underline">
              Ver detalle de {med.nombre} →
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

async function fetcher(url: string): Promise<{ medicamentos: Medicamento[] }> {
  return fetchJsonWithTimeout<{ medicamentos: Medicamento[] }>(url)
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  )
}
