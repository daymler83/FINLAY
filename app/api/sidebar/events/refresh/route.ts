import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cron secret to protect this endpoint
const CRON_SECRET = process.env.CRON_SECRET

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const today = new Date()
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ]
    const currentMonth = monthNames[today.getMonth()]
    const currentYear = today.getFullYear()
    const nextMonth = monthNames[(today.getMonth() + 1) % 12]

    const prompt = `Eres un experto en farmacología clínica y eventos académicos de salud. Genera una lista de 8 eventos reales o altamente probables (congresos, conferencias, webinars, simposios) relacionados con farmacología, medicina interna, oncología, cardiología u otras especialidades farmacológicas para los meses de ${currentMonth} a ${nextMonth} de ${currentYear}.

Para cada evento, proporciona la información en formato JSON estrictamente así:
[
  {
    "title": "Nombre del congreso o evento",
    "description": "Breve descripción del evento (1-2 oraciones)",
    "date": "YYYY-MM-DD",
    "url": "https://url-del-evento-si-existe-o-null",
    "source": "Organización/Sociedad que lo realiza",
    "type": "conference|webinar|symposium|workshop"
  }
]

Incluye eventos de instituciones reconocidas como ESC, ACC, ASHP, ISAP, Sociedad Chilena de Farmacología, etc. Si no tienes certeza de la URL exacta, usa null. Responde SOLO el JSON, sin texto adicional.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.4,
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No se encontró JSON en la respuesta de OpenAI')
    }

    const events: Array<{
      title: string
      description?: string
      date?: string
      url?: string
      source?: string
      type?: string
    }> = JSON.parse(jsonMatch[0])

    // Upsert events by title (avoid duplicates)
    let created = 0
    for (const ev of events) {
      const existing = await prisma.sidebarEvent.findFirst({
        where: { title: ev.title },
      })
      if (!existing) {
        await prisma.sidebarEvent.create({
          data: {
            title: ev.title,
            description: ev.description ?? null,
            date: ev.date ? new Date(ev.date) : null,
            url: ev.url ?? null,
            source: ev.source ?? null,
            type: ev.type ?? 'conference',
          },
        })
        created++
      }
    }

    // Clean up past events older than 60 days
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const deleted = await prisma.sidebarEvent.deleteMany({
      where: { date: { lt: cutoff } },
    })

    return NextResponse.json({
      ok: true,
      created,
      deleted: deleted.count,
      total: events.length,
    })
  } catch (err) {
    console.error('[sidebar/events/refresh]', err)
    return NextResponse.json({ error: 'Error al actualizar eventos' }, { status: 500 })
  }
}
