'use client'
import Link from 'next/link'
import { Pill } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 max-w-md md:max-w-2xl lg:max-w-4xl">
        <Link href="/" className="flex items-center gap-2">
          <Pill className="text-blue-600" size={28} />
          <span className="font-bold text-xl text-gray-800">Farma<span className="text-blue-600">Chile</span></span>
        </Link>
      </div>
    </header>
  )
}