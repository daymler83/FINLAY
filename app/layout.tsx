import './globals.css'
import { Inter } from 'next/font/google'
import Header from './components/Layout/Header'
import MobileNav from './components/Layout/MobileNav'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
          <Header />
          <main className="container mx-auto px-4 py-4 max-w-md md:max-w-2xl lg:max-w-4xl">
            {children}
          </main>
          <MobileNav />
        </div>
      </body>
    </html>
  )
}