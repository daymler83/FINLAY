'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Scale, Star, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const links = [
    { href: '/',         icon: Home,  label: 'Inicio' },
    { href: '/compare',  icon: Scale, label: 'Comparar' },
    { href: '/favoritos', icon: Star,  label: 'Favoritos' },
    ...(!user?.isPro ? [{ href: '/pro', icon: Zap, label: 'Pro' }] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-40">
      <div className="flex justify-around py-1">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center px-3 py-2 min-w-[60px] min-h-[52px] justify-center rounded-xl transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} fill={active && (href === '/favoritos') ? 'currentColor' : 'none'} />
              <span className="text-[10px] mt-0.5 font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
