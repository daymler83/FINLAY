import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import Header from './components/Layout/Header'
import MobileNav from './components/Layout/MobileNav'
import Sidebar from './components/Layout/Sidebar'
import { getSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'FINLAY — Fármacos en Chile',
  description: 'Plataforma de información clínica sobre fármacos en Chile con asistente IA, búsqueda de papers académicos y calendario de eventos farmacológicos.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  const isPro = session?.isPro ?? false

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen pb-16 md:pb-0">
          <Header />
          <div className="flex">
            <Sidebar isPro={isPro} />
            <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl md:pl-20">
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
      </body>
    </html>
  )
}
