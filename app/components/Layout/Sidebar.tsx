'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Bot, BookOpen, CalendarDays,
  ChevronRight, Send, Loader2,
  ExternalLink, Lock, X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Paper {
  pmid: string
  title: string
  abstract: string
  authors: string[]
  journal: string
  year: string
  url: string
}

interface SidebarEvent {
  id: string
  title: string
  description?: string | null
  date?: string | null
  url?: string | null
  source?: string | null
  type: string
}

type Tab = 'chat' | 'papers' | 'events'

interface SidebarProps {
  isPro: boolean
}

function formatEventDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Sidebar({ isPro }: SidebarProps) {
  const { user } = useAuth()
  const effectiveIsPro = user?.isPro ?? isPro
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Papers state
  const [paperQuery, setPaperQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [papersLoading, setPapersLoading] = useState(false)
  const [expandedAbstract, setExpandedAbstract] = useState<string | null>(null)

  // Events state
  const [events, setEvents] = useState<SidebarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsLoaded, setEventsLoaded] = useState(false)

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (open && tab === 'events' && effectiveIsPro && !eventsLoaded) {
      loadEvents()
    }
  }, [open, tab, effectiveIsPro, eventsLoaded])

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const res = await fetch('/api/sidebar/events')
      const data = await res.json()
      setEvents(data.events ?? [])
      setEventsLoaded(true)
    } catch {
      // silent fail
    } finally {
      setEventsLoading(false)
    }
  }

  async function sendMessage() {
    const msg = input.trim()
    if (!msg || chatLoading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('/api/sidebar/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages }),
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply ?? 'Sin respuesta.' }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Error al conectar. Intenta nuevamente.' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function searchPapers() {
    const q = paperQuery.trim()
    if (!q || papersLoading) return
    setPapersLoading(true)
    setPapers([])
    setExpandedAbstract(null)
    try {
      const res = await fetch('/api/sidebar/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setPapers(data.papers ?? [])
    } catch {
      // silent
    } finally {
      setPapersLoading(false)
    }
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string; proOnly?: boolean }[] = [
    { id: 'chat', icon: <Bot size={16} />, label: 'Consulta IA' },
    { id: 'papers', icon: <BookOpen size={16} />, label: 'Papers', proOnly: true },
    { id: 'events', icon: <CalendarDays size={16} />, label: 'Eventos', proOnly: true },
  ]

  return (
    <>
      {/* Mobile floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-lg flex items-center justify-center"
          aria-label="Abrir barra inteligente"
        >
          <Bot size={20} />
        </button>
      )}

      {/* Mobile backdrop */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/30 z-40"
          aria-label="Cerrar barra inteligente"
        />
      )}

      {/* Collapsed sidebar — narrow strip */}
      <aside
        className={`hidden md:flex fixed left-0 top-16 bottom-0 z-30 flex-col items-center pt-4 gap-3 bg-white border-r border-slate-200 transition-all duration-300 ${
          open ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'w-14'
        }`}
      >
        {/* Pulse trigger button */}
        <button
          onClick={() => setOpen(true)}
          className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          aria-label="Abrir asistente"
        >
          <Bot size={18} />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-xl animate-ping bg-slate-700 opacity-30 pointer-events-none" />
        </button>

        {/* Other icons — muted */}
        <button
          onClick={() => { setOpen(true); setTab('papers') }}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
          aria-label="Papers académicos"
        >
          <BookOpen size={16} />
          {!effectiveIsPro && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>

        <button
          onClick={() => { setOpen(true); setTab('events') }}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
          aria-label="Calendario de eventos"
        >
          <CalendarDays size={16} />
          {!effectiveIsPro && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
      </aside>

      {/* Expanded sidebar panel */}
      <aside
        className={`fixed left-0 right-0 top-12 bottom-16 md:top-16 md:bottom-0 md:right-auto z-50 flex flex-col bg-white border-t md:border-t-0 md:border-r border-slate-200 shadow-xl transition-all duration-300 ${
          open
            ? 'opacity-100 translate-y-0 md:w-80'
            : 'opacity-0 translate-y-full pointer-events-none md:translate-y-0 md:w-0 md:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <span className="font-semibold text-sm text-slate-800">Asistente FINLAY</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
                tab === t.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.proOnly && !effectiveIsPro && (
                <span className="absolute top-1.5 right-3">
                  <Lock size={8} className="text-amber-500" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ── CHAT TAB ── */}
          {tab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto mb-3">
                      <Bot size={20} className="text-white" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Consulta sobre fármacos</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {effectiveIsPro
                        ? 'Acceso completo al catálogo (10k+ medicamentos)'
                        : 'Catálogo básico de 10 medicamentos. Actualiza a Pro para acceso completo.'}
                    </p>
                    <div className="mt-4 grid gap-1.5">
                      {[
                        '¿Cuál es la vida media del ibuprofeno?',
                        '¿Qué interacciones tiene la warfarina?',
                        '¿Cuáles son las contraindicaciones del metformín?',
                      ].map(hint => (
                        <button
                          key={hint}
                          onClick={() => setInput(hint)}
                          className="text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                        m.role === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-sm'
                          : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3 py-2">
                      <Loader2 size={14} className="text-slate-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-3 pb-3 shrink-0 border-t border-slate-100 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Pregunta sobre un fármaco…"
                    className="flex-1 text-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={chatLoading || !input.trim()}
                    className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40 hover:bg-slate-700 transition-colors shrink-0"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">
                  Apoyo informativo para profesionales de salud. No reemplaza juicio clínico ni indicación médica.
                </p>
              </div>
            </>
          )}

          {/* ── PAPERS TAB ── */}
          {tab === 'papers' && (
            <>
              {!effectiveIsPro ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                    <BookOpen size={20} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Búsqueda de papers</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accede a abstracts de PubMed sobre cualquier fármaco. Disponible en plan Pro.
                  </p>
                  <a
                    href="/pro"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Ver plan Pro
                  </a>
                </div>
              ) : (
                <>
                  <div className="px-3 pt-3 pb-2 shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paperQuery}
                        onChange={e => setPaperQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && searchPapers()}
                        placeholder="Ej: metformin type 2 diabetes"
                        className="flex-1 text-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                      />
                      <button
                        onClick={searchPapers}
                        disabled={papersLoading || !paperQuery.trim()}
                        className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center disabled:opacity-40 hover:bg-slate-700 transition-colors shrink-0"
                      >
                        {papersLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 px-0.5">
                      Busca en PubMed. Usa términos en inglés para mejores resultados.
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5">
                    {papers.length === 0 && !papersLoading && (
                      <div className="text-center py-8 text-slate-400">
                        <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Busca un fármaco o condición clínica</p>
                      </div>
                    )}
                    {papers.map(p => (
                      <div key={p.pmid} className="border border-slate-200 rounded-xl p-3 bg-white hover:border-slate-300 transition-colors">
                        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{p.title}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {p.authors.join(', ')}{p.authors.length > 0 ? ' · ' : ''}{p.journal} · {p.year}
                        </p>
                        {expandedAbstract === p.pmid ? (
                          <>
                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{p.abstract}</p>
                            <button
                              onClick={() => setExpandedAbstract(null)}
                              className="text-[10px] text-blue-600 mt-1.5 font-medium hover:underline"
                            >
                              Ocultar abstract
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setExpandedAbstract(p.pmid)}
                            className="text-[10px] text-blue-600 mt-1.5 font-medium hover:underline"
                          >
                            Ver abstract
                          </button>
                        )}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ExternalLink size={10} />
                          PubMed
                        </a>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── EVENTS TAB ── */}
          {tab === 'events' && (
            <>
              {!effectiveIsPro ? (
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                    <CalendarDays size={20} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Calendario de eventos</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Congresos y conferencias farmacológicas. Se actualiza automáticamente. Disponible en plan Pro.
                  </p>
                  <a
                    href="/pro"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Ver plan Pro
                  </a>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                  {eventsLoading && (
                    <div className="flex justify-center py-8">
                      <Loader2 size={20} className="text-slate-300 animate-spin" />
                    </div>
                  )}
                  {!eventsLoading && events.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No hay eventos próximos</p>
                    </div>
                  )}
                  {events.map(ev => (
                    <div key={ev.id} className="border border-slate-200 rounded-xl p-3 bg-white hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">{ev.title}</p>
                          {ev.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {ev.date && (
                              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {formatEventDate(ev.date)}
                              </span>
                            )}
                            {ev.source && (
                              <span className="text-[10px] text-slate-400">{ev.source}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md shrink-0 ${
                          ev.type === 'conference' ? 'bg-blue-50 text-blue-600' :
                          ev.type === 'webinar'    ? 'bg-green-50 text-green-600' :
                          ev.type === 'symposium'  ? 'bg-purple-50 text-purple-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {ev.type}
                        </span>
                      </div>
                      {ev.url && (
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <ExternalLink size={10} />
                          Más info
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Open sidebar arrow for collapsed state */}
        <button
          onClick={() => setOpen(false)}
          className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Cerrar barra lateral"
        >
          <ChevronRight size={12} className="rotate-180" />
        </button>
      </aside>
    </>
  )
}
