'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Pill, Scale, Home } from 'lucide-react'

export default function MobileNav() {
  const pathname = usePathname()
  
  const links = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/compare', icon: Scale, label: 'Comparar' },
    { href: '/medicamentos', icon: Pill, label: 'Medicamentos' },
  ]
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="flex justify-around py-2">
        {links.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center p-2 ${
              pathname === href ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}