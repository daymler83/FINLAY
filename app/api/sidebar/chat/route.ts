import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const isPro = session?.isPro ?? false

    const { message, history = [] } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // Fetch medications based on tier
    const medicamentos = await prisma.medicamento.findMany({
      take: isPro ? 500 : 10,
      orderBy: { nombre: 'asc' },
      select: {
        nombre: true,
        principioActivo: true,
        familia: true,
        presentacion: true,
        laboratorio: true,
        precioReferencia: true,
        vidaMedia: true,
        nivelInteracciones: true,
        indicaciones: true,
        efectosAdversos: isPro,
        contraindicaciones: isPro,
      },
    })

    const catalogSummary = medicamentos.map(m => {
      const lines = [
        `• ${m.nombre} (${m.principioActivo})`,
        `  Familia: ${m.familia}`,
        `  Presentación: ${m.presentacion}`,
        m.vidaMedia ? `  Vida media: ${m.vidaMedia}` : null,
        m.nivelInteracciones ? `  Interacciones: ${m.nivelInteracciones}` : null,
        m.indicaciones?.length ? `  Indicaciones: ${m.indicaciones.slice(0, 3).join(', ')}` : null,
        isPro && m.efectosAdversos?.length ? `  Ef. adversos: ${m.efectosAdversos.slice(0, 3).join(', ')}` : null,
        isPro && m.contraindicaciones?.length ? `  Contraind.: ${m.contraindicaciones.slice(0, 2).join(', ')}` : null,
      ].filter(Boolean)
      return lines.join('\n')
    }).join('\n\n')

    const systemPrompt = isPro
      ? `Eres un asistente clínico de farmacología para FINLAY, plataforma chilena de información sobre medicamentos. Tienes acceso al catálogo completo de ${medicamentos.length} medicamentos disponibles en Chile. Responde siempre en español, de forma concisa y clínica. Cuando menciones un medicamento del catálogo, cítalo por su nombre exacto. Si la pregunta no está relacionada con los medicamentos del catálogo, indícalo amablemente.\n\nCATÁLOGO DISPONIBLE:\n${catalogSummary}`
      : `Eres un asistente clínico de farmacología para FINLAY. Tienes acceso a un catálogo básico de ${medicamentos.length} medicamentos. Responde en español de forma concisa. Para acceso completo a 500+ medicamentos, efectos adversos y contraindicaciones, sugiere el plan Pro cuando sea relevante.\n\nCATÁLOGO DISPONIBLE:\n${catalogSummary}`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.3,
    })

    const reply = completion.choices[0]?.message?.content ?? 'Sin respuesta.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[sidebar/chat]', err)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}
