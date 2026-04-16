import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadSyncedProUser } from '@/lib/proSubscription'
import { formatMedicationDisplayName } from '@/lib/medicationDisplay'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  return new OpenAI({ apiKey })
}

function extractSearchTerms(message: string) {
  const stopwords = new Set([
    'que', 'como', 'cual', 'cuales', 'dime', 'sobre', 'para', 'con', 'sin', 'por', 'del', 'las', 'los',
    'una', 'uno', 'unos', 'unas', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'tiene', 'tienen', 'sirve', 'sirven', 'puede', 'pueden', 'quiero', 'necesito', 'medicamento',
    'farmaco', 'farmacos', 'fármaco', 'fármacos', 'chat', 'ia', 'finlay', 'pro', 'hola', 'favor',
  ])

  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const terms = normalized
    .split(/[^a-z0-9]+/)
    .map(term => term.trim())
    .filter(term => term.length >= 4 && !stopwords.has(term))

  return [...new Set(terms)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 4)
}

function normalizeMessageForCache(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildChatRequestHash(input: {
  message: string
  isPro: boolean
  medicationIds: string[]
  history: Array<{ role: string; content: string }>
}) {
  const normalized = {
    message: normalizeMessageForCache(input.message),
    isPro: input.isPro,
    medicationIds: [...input.medicationIds].sort(),
    history: input.history.slice(-4).map(item => ({
      role: item.role,
      content: normalizeMessageForCache(item.content),
    })),
  }
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAIClient()
    const session = await getSession()
    const usuario = session ? await loadSyncedProUser(session.userId) : null
    const isPro = Boolean(usuario?.isPro)

    const { message, history = [] } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    const select = {
      id: true,
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
    } as const

    let medicamentos: Array<{
      id: string
      nombre: string
      principioActivo: string
      familia: string
      presentacion: string
      laboratorio: string
      precioReferencia: number | null
      vidaMedia: string | null
      nivelInteracciones: string | null
      indicaciones?: string[] | null
      efectosAdversos?: string[] | null
      contraindicaciones?: string[] | null
    }> = []

    const terms = extractSearchTerms(message)
    if (terms.length === 0) {
      return NextResponse.json({
        reply: 'Para responder con precisión, indícame al menos un medicamento por nombre comercial o principio activo.',
      })
    }
    const primaryTerm = terms[0]

    const primaryMatches = await prisma.medicamento.findMany({
      where: {
        OR: [
          { nombre: { contains: primaryTerm, mode: 'insensitive' } },
          { principioActivo: { contains: primaryTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { nombre: 'asc' },
      select,
      take: isPro ? 120 : 10,
    })

    const secondaryWhere = terms.length > 1
      ? {
        OR: terms.slice(1).flatMap(term => ([
          { nombre: { contains: term, mode: 'insensitive' as const } },
          { principioActivo: { contains: term, mode: 'insensitive' as const } },
          { familia: { contains: term, mode: 'insensitive' as const } },
          { laboratorio: { contains: term, mode: 'insensitive' as const } },
        ])),
      }
      : undefined

    const secondaryMatches = secondaryWhere
      ? await prisma.medicamento.findMany({
        where: secondaryWhere,
        orderBy: { nombre: 'asc' },
        select,
        take: isPro ? 120 : 10,
      })
      : []

    const map = new Map<string, (typeof primaryMatches)[number]>()
    primaryMatches.forEach(m => map.set(m.id, m))
    secondaryMatches.forEach(m => {
      if (!map.has(m.id)) map.set(m.id, m)
    })
    medicamentos = [...map.values()].slice(0, isPro ? 120 : 10)

    if (medicamentos.length === 0) {
      return NextResponse.json({
        reply: `No encontré ese medicamento en el catálogo de FINLAY. Verifica el nombre comercial o principio activo e intenta nuevamente.`,
      })
    }

    const requestHash = buildChatRequestHash({
      message,
      isPro,
      medicationIds: medicamentos.map(m => m.id),
      history,
    })

    const cachedRows = await prisma.$queryRaw<Array<{ response: string }>>`
      SELECT response
      FROM "SidebarChatCache"
      WHERE "requestHash" = ${requestHash}
      LIMIT 1
    `
    const cached = cachedRows[0]?.response
    if (cached) {
      return NextResponse.json({ reply: cached, cached: true })
    }

    const catalogSummary = medicamentos.map(m => {
      const lines = [
        `• ${formatMedicationDisplayName(m.nombre)} (${m.principioActivo})`,
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
      ? `Eres un asistente clínico de farmacología para FINLAY, plataforma chilena de información sobre medicamentos. Tienes acceso al catálogo completo de 10k+ medicamentos disponibles en Chile. Para esta consulta se te entrega un subconjunto clínicamente relevante de ${medicamentos.length} medicamentos. Responde siempre en español, de forma concisa y clínica. Cuando menciones un medicamento del catálogo, cítalo por su nombre exacto y evita escribirlo completamente en MAYÚSCULAS. Si no encuentras un nombre exacto en este subconjunto, evita afirmar que "no existe"; en su lugar pide confirmar nombre comercial/principio activo y ofrece alternativas cercanas.\n\nCATÁLOGO DISPONIBLE:\n${catalogSummary}`
      : `Eres un asistente clínico de farmacología para FINLAY. Tienes acceso a un catálogo básico de ${medicamentos.length} medicamentos. Responde en español de forma concisa. Cuando menciones medicamentos, evita escribirlos completamente en MAYÚSCULAS. Para acceso completo a 10k+ medicamentos, efectos adversos y contraindicaciones, sugiere el plan Pro cuando sea relevante.\n\nCATÁLOGO DISPONIBLE:\n${catalogSummary}`

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

    const cacheId = crypto.randomUUID()
    const normalizedMessage = normalizeMessageForCache(message)
    const medicationIdsJson = JSON.stringify([...new Set(medicamentos.map(m => m.id))].sort())

    await prisma.$executeRaw`
      INSERT INTO "SidebarChatCache"
        ("id", "requestHash", "message", "normalizedMessage", "response", "medicationIds", "isPro", "sourceModel", "createdByUserId", "updatedAt")
      VALUES
        (${cacheId}, ${requestHash}, ${message}, ${normalizedMessage}, ${reply}, ${medicationIdsJson}::jsonb, ${isPro}, 'gpt-4o-mini', ${session?.userId ?? null}, NOW())
      ON CONFLICT ("requestHash")
      DO UPDATE SET
        "response" = EXCLUDED."response",
        "updatedAt" = NOW(),
        "sourceModel" = EXCLUDED."sourceModel",
        "createdByUserId" = EXCLUDED."createdByUserId"
    `

    return NextResponse.json({ reply, cached: false })
  } catch (err) {
    console.error('[sidebar/chat]', err)
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 })
  }
}
