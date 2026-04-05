'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Cross, LogOut, Zap, Star, MessageSquareText, BookOpenText } from 'lucide-react'
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-5xl h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Cross size={16} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">FINLAY</span>
        </Link>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link
            href="/feedback"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MessageSquareText size={14} />
            Feedback
          </Link>
          <Link
            href="/acerca-de"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <BookOpenText size={14} />
            Qué es FINLAY
          </Link>
          {user ? (
            <>
              {user.isPro ? (
                <span className="hidden sm:inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">
                  <Zap size={11} /> Pro
                </span>
              ) : (
                <Link
                  href="/pro"
                  className="hidden sm:inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Zap size={11} /> Obtener Pro
                </Link>
              )}
              <Link
                href="/favoritos"
                className="p-2 text-gray-400 hover:text-yellow-500 transition-colors rounded-lg hover:bg-gray-100"
                aria-label="Favoritos"
              >
                <Star size={16} />
              </Link>
              <span className="hidden sm:block text-xs text-gray-400 max-w-[120px] truncate">
                {user.nombre ?? user.email}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
