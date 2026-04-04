import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import Header from './components/Layout/Header'
import MobileNav from './components/Layout/MobileNav'

export const metadata: Metadata = {
  title: 'FINLAY — Fármacos en Chile',
  description: 'Consulta y compara información clínica de fármacos disponibles en Chile: indicaciones, efectos adversos, contraindicaciones y más.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen pb-16 md:pb-0">
          <Header />
          <main className="container mx-auto px-4 py-6 max-w-5xl">
            {children}
          </main>
          <MobileNav />
        </div>
      </body>
    </html>
  )
}
