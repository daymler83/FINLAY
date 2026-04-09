import Link from 'next/link'
import { ArrowLeft, BookOpenText, Stethoscope, ShieldCheck, Pill, FileText } from 'lucide-react'

const sections = [
  {
    title: 'Qué es FINLAY',
    body: 'FINLAY es una herramienta de consulta rápida para medicamentos disponibles en Chile, pensada para apoyar la revisión clínica y la orientación del producto durante una prueba con colegas.',
    icon: BookOpenText,
  },
  {
    title: 'Para quién está pensado',
    body: 'Está orientado a médicos y profesionales de salud que necesitan revisar fármacos, compararlos y navegar información clínica de forma más rápida.',
    icon: Stethoscope,
  },
  {
    title: 'Qué incluye la versión Pro',
    body: 'La versión Pro amplía el catálogo, permite comparar más medicamentos y desbloquea funciones de uso más intensivo.',
    icon: ShieldCheck,
  },
]

export default function AcercaDePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Volver
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <FileText size={14} />
          Guía para médicos
        </div>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100">
          <Pill size={14} />
          FINLAY
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Documento breve para entender la app</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">
          Esta página resume el propósito de FINLAY, su alcance y cómo usarla durante la etapa de feedback con colegas.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map(({ title, body, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <Icon size={20} className="text-blue-600" />
            <h2 className="mt-3 text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Cómo usarla en esta etapa</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            'Buscar por nombre comercial, principio activo o laboratorio.',
            'Comparar fármacos y revisar si la información clínica te resulta útil.',
            'Enviar feedback desde la app con problemas, ideas o faltantes.',
            'Evitar introducir datos reales si solo estás haciendo pruebas.',
          ].map(item => (
            <div key={item} className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-900">Nota importante</h2>
        <p className="mt-2 text-sm leading-6 text-blue-800">
          FINLAY todavía está en una etapa de validación. La intención de esta versión es recopilar observaciones reales de uso
          para afinar contenido, navegación y propuesta de valor antes de un despliegue más amplio.
        </p>
      </section>
    </div>
  )
}
