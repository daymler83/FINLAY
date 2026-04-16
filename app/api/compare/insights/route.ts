import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { loadSyncedProUser } from '@/lib/proSubscription'

export const dynamic = 'force-dynamic'

type PatientProfile = {
  age?: number | null
  weight?: number | null
  renalFunction?: string
  hepaticFunction?: string
  pregnancy?: string
  lactation?: string
  clinicalContext?: string
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  return new OpenAI({ apiKey })
}

function parseJson(raw: string) {
  const clean = raw
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  return JSON.parse(clean)
}

function normalizeString(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function buildRequestHash(medicationIds: string[], patientProfile: PatientProfile) {
  const normalized = {
    medicationIds: [...medicationIds].sort(),
    patientProfile: {
      age: patientProfile.age ?? null,
      weight: patientProfile.weight ?? null,
      renalFunction: patientProfile.renalFunction ?? '',
      hepaticFunction: patientProfile.hepaticFunction ?? '',
      pregnancy: patientProfile.pregnancy ?? '',
      lactation: patientProfile.lactation ?? '',
      clinicalContext: patientProfile.clinicalContext ?? '',
    },
  }

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAIClient()
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const usuario = await loadSyncedProUser(session.userId)

    if (!usuario?.isPro) {
      return NextResponse.json({ error: 'Requiere Pro' }, { status: 403 })
    }

    const body = await request.json()
    const medicationIds = Array.isArray(body?.medicationIds) ? body.medicationIds.filter(Boolean) : []
    const profileRaw = body?.patientProfile ?? {}

    if (medicationIds.length < 2) {
      return NextResponse.json({ error: 'Selecciona al menos 2 medicamentos' }, { status: 400 })
    }

    const medications = await prisma.medicamento.findMany({
      where: { id: { in: medicationIds } },
      select: {
        id: true,
        nombre: true,
        principioActivo: true,
        presentacion: true,
        familia: true,
        laboratorio: true,
        precioReferencia: true,
        vidaMedia: true,
        nivelInteracciones: true,
        efectosAdversos: true,
        contraindicaciones: true,
        indicaciones: true,
      },
      orderBy: { nombre: 'asc' },
    })

    if (medications.length < 2) {
      return NextResponse.json({ error: 'No se encontraron suficientes medicamentos' }, { status: 404 })
    }

    const patientProfile: PatientProfile = {
      age: normalizeNumber(profileRaw.age),
      weight: normalizeNumber(profileRaw.weight),
      renalFunction: normalizeString(profileRaw.renalFunction),
      hepaticFunction: normalizeString(profileRaw.hepaticFunction),
      pregnancy: normalizeString(profileRaw.pregnancy),
      lactation: normalizeString(profileRaw.lactation),
      clinicalContext: normalizeString(profileRaw.clinicalContext),
    }

    const requestHash = buildRequestHash(medicationIds, patientProfile)

    const cachedRows = await prisma.$queryRaw<Array<{ response: unknown }>>`
      SELECT response
      FROM "ComparisonInsightCache"
      WHERE "requestHash" = ${requestHash}
      LIMIT 1
    `

    const cached = cachedRows[0]?.response
    if (cached) {
      return NextResponse.json({
        ...(typeof cached === 'object' && cached !== null ? cached : {}),
        cached: true,
      })
    }

    const prompt = `Actúa como químico farmacéutico clínico para una herramienta de apoyo a la prescripción en Chile.

Tu tarea es analizar los medicamentos y el perfil de paciente y responder SOLO con JSON válido, sin markdown ni texto extra.

Perfil de paciente:
${JSON.stringify(patientProfile, null, 2)}

Medicamentos a comparar:
${JSON.stringify(medications, null, 2)}

Devuelve un objeto con esta forma:
{
  "summary": "resumen breve y clínico de la comparación",
  "profileSummary": "resumen de cómo cambia la lectura según el perfil del paciente",
  "bestMatch": {
    "medicationId": "id del medicamento mejor posicionado o null",
    "reason": "por qué"
  },
  "medications": [
    {
      "medicationId": "id del medicamento",
      "profileFit": {
        "label": "Preferible | Precaución | Evitar",
        "reasons": ["razon 1", "razon 2"]
      },
      "evidence": {
        "level": "Alta | Moderada | Baja",
        "summary": "resumen corto de respaldo clínico",
        "guidelineSupport": "si hay apoyo de guias o literatura, mencionalo; si no, deja claro que es una inferencia"
      },
      "adverseEffects": {
        "common": ["efecto frecuente 1", "efecto frecuente 2"],
        "severity": "Baja | Moderada | Alta",
        "visualSummary": "frase corta para comparar visualmente"
      },
      "posology": {
        "route": "via de administracion",
        "frequency": "1 vez al dia / 2 veces al dia / etc.",
        "comfort": "Alta | Media | Baja",
        "notes": "comentario breve sobre comodidad posologica"
      },
      "onset": "tiempo hasta efecto o null si no es razonable precisarlo",
      "pregnancy": "Apto | Precaucion | Evitar | No definido",
      "lactation": "Apto | Precaucion | Evitar | No definido",
      "cost": {
        "referencePriceClp": 0,
        "dailyEstimateClp": "estimacion si se puede inferir o null",
        "comment": "comentario breve sobre costo al paciente"
      }
    }
  ],
  "urgentSubstitution": {
    "summary": "si falta uno de los medicamentos, cual es la mejor alternativa dentro de los comparados o que criterio seguir",
    "alternatives": [
      {
        "fromMedicationId": "id del medicamento a sustituir o null",
        "toMedicationId": "id de la alternativa o null",
        "reason": "motivo clinico breve"
      }
    ]
  }
}

Reglas:
- No inventes datos concretos si no tienes base razonable. Si no estás seguro, usa null o deja una advertencia explícita.
- Prioriza seguridad, interacciones y adecuación al perfil del paciente.
- En embarazo y lactancia, marca claramente Evitar / Precaucion / Apto.
- En evidencia clínica, usa una estimación cualitativa, no números inventados.
- En costo, usa el precio de referencia disponible como base y, si no puedes estimar costo diario con seguridad, deja dailyEstimateClp en null.
- Mantén todo en español.`

    const res = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Eres un farmacólogo clínico estricto, preciso y conservador.' },
        { role: 'user', content: prompt },
      ],
    })

    const raw = res.choices[0]?.message?.content ?? '{}'
    const parsed = parseJson(raw)

    const responsePayload = {
      ...parsed,
      medications: Array.isArray(parsed.medications) ? parsed.medications : [],
      cached: false,
    }

    const medicationIdsJson = JSON.stringify([...medicationIds].sort())
    const patientProfileJson = JSON.stringify(patientProfile)
    const responseJson = JSON.stringify(responsePayload)
    const cacheId = crypto.randomUUID()

    await prisma.$executeRaw`
      INSERT INTO "ComparisonInsightCache"
        ("id", "requestHash", "medicationIds", "patientProfile", "response", "sourceModel", "createdByUserId", "updatedAt")
      VALUES
        (${cacheId}, ${requestHash}, ${medicationIdsJson}::jsonb, ${patientProfileJson}::jsonb, ${responseJson}::jsonb, 'gpt-4.1', ${session.userId}, NOW())
      ON CONFLICT ("requestHash")
      DO UPDATE SET
        "medicationIds" = EXCLUDED."medicationIds",
        "patientProfile" = EXCLUDED."patientProfile",
        "response" = EXCLUDED."response",
        "sourceModel" = EXCLUDED."sourceModel",
        "updatedAt" = NOW(),
        "createdByUserId" = EXCLUDED."createdByUserId"
    `

    return NextResponse.json({
      ...responsePayload,
    })
  } catch (error) {
    console.error('Error generando insights clínicos:', error)
    return NextResponse.json({ error: 'No se pudo generar el análisis clínico' }, { status: 500 })
  }
}
