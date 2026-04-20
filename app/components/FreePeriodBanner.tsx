import { Zap } from 'lucide-react'

interface FreePeriodBannerProps {
  endDate: Date
}

export default function FreePeriodBanner({ endDate }: FreePeriodBannerProps) {
  const formatted = endDate.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santiago',
  })

  return (
    <div className="bg-slate-900 text-white px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
      <Zap size={11} fill="currentColor" className="text-amber-400 shrink-0" />
      <span>
        Acceso gratuito activo hasta el <strong>{formatted}</strong> · 5 consultas IA incluidas
      </span>
    </div>
  )
}
