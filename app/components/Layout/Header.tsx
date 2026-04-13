'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Cross, LogOut, LogIn, UserPlus, Zap, Star, MessageSquareText, BookOpenText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Header() {
  const router = useRouter()
  const { user, mutate } = useAuth()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await mutate()
    router.push('/')
  }

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-5xl h-12 sm:h-14 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <Cross size={14} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">FINLAY</span>
        </Link>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/feedback"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <MessageSquareText size={13} />
            Feedback
          </Link>
          <Link
            href="/acerca-de"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <BookOpenText size={13} />
            Qué es FINLAY
          </Link>
          {user ? (
            <>
              {user.isPro ? (
                <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">
                  <Zap size={10} fill="currentColor" /> Pro
                </span>
              ) : (
                <Link
                  href="/pro"
                  className="hidden sm:inline-flex items-center gap-1 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <Zap size={10} fill="currentColor" /> Obtener Pro
                </Link>
              )}
              <Link
                href="/favoritos"
                className="p-2 text-slate-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-slate-100"
                aria-label="Favoritos"
              >
                <Star size={15} />
              </Link>
              <span className="hidden sm:block text-xs text-slate-400 max-w-[120px] truncate font-medium">
                {user.nombre ?? user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
                aria-label="Cerrar sesión"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 px-3 sm:px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <LogIn size={13} />
                <span className="hidden sm:inline">Iniciar sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <UserPlus size={13} />
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
