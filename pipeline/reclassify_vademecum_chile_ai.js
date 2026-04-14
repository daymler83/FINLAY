/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const OpenAI = require('openai')
require('dotenv').config()

const { classifyVademecumRecord, cleanText } = require('./vademecum_classifier')

const INPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')
const CACHE_FILE = path.join(__dirname, 'data', 'vademecum-chile-ai-reclassify.json')
const OUTPUT_FILE = path.join('/tmp', 'vademecum-chile-ai-reclassify.sql')
const MODEL = 'gpt-5.4'
const BATCH_SIZE = 25
const MIN_CONFIDENCE = 0.75

const ALLOWED_FAMILIES = [
  'IECA',
  'ARA-II',
  'Betabloqueador',
  'Bloqueador de canales de calcio',
  'Diurético',
  'Antidiabético',
  'AINE',
  'Antibiótico',
  'Estatina',
  'Inhibidor de bomba de protones',
  'Analgésico/antipirético',
  'ISRS',
  'IRSN',
  'Antipsicótico',
  'Benzodiacepina',
  'Hipnótico',
  'Anticoagulante',
  'Antiagregante',
  'Antihistamínico',
  'Antileucotrieno',
  'Hormona tiroidea',
  'Broncodilatador beta-2',
  'Corticoide',
  'Antifúngico',
  'Antiparasitario',
  'Antiemético',
  'Alfa-bloqueador',
  'Inhibidor 5-alfa reductasa',
  'Anticonvulsivante',
  'Opioide',
  'Antiviral',
  'Antiarritmico',
  'Anticonceptivo hormonal',
  'Antiespasmódico',
  'Antitusivo',
  'Laxante',
  'Anestésico local',
  'Vasopresor/simpaticomimético',
  'Antiséptico',
  'Biológico/hematológico',
  'Hormonal reproductivo',
  'Inmunológico/vacuna',
  'Antineoplásico',
  'Dispositivo médico',
  'Suplemento/Nutrición',
  'Dermocosmético',
  'Oftálmico/lubricante',
  'Urológico',
  'Otro',
]

function buildContext(record) {
  const sections = record && typeof record.sections === 'object' && record.sections
    ? Object.values(record.sections).flat().filter(Boolean).slice(0, 8)
    : []

  return [
    record.nombre,
    record.nombreLocal,
    record.principioActivo,
    record.atc && typeof record.atc === 'object' ? record.atc.label : '',
    record.atc && typeof record.atc === 'object' ? record.atc.code : '',
    record.via,
    record.forma,
    record.indicaciones,
    record.contraindicaciones,
    record.interacciones,
    record.reaccionesAdversas,
    record.advertenciasPrecauciones,
    sections,
  ]
    .flat()
    .map(value => cleanText(value, ''))
    .filter(Boolean)
    .join(' | ')
    .slice(0, 3500)
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

function escapeSql(value) {
  return String(value || '').replace(/'/g, "''")
}

function buildSql(updates) {
  const statements = updates.map(item => (
    `UPDATE "Medicamento" SET "familia" = '${escapeSql(item.familia)}', "updatedAt" = CURRENT_TIMESTAMP WHERE "nombre" = '${escapeSql(item.nombre)}' AND "laboratorio" = 'Vademecum Chile' AND "familia" = 'Otro';`
  ))

  return `BEGIN;\n${statements.join('\n')}\nCOMMIT;\n`
}

async function classifyBatch(client, batch) {
  const prompt = `Clasifica productos de Vademecum Chile en una sola familia farmacológica o funcional.

Familias permitidas:
${ALLOWED_FAMILIES.join(', ')}

Devuelve SOLO JSON válido con esta forma:
{
  "items": [
    {
      "nombre": "texto exacto recibido",
      "familia": "una familia de la lista permitida",
      "confidence": 0.0,
      "reason": "motivo breve en español"
    }
  ]
}

Reglas:
- Usa "Otro" si no hay base suficiente.
- Prefiere clasificaciones funcionales como "Dispositivo médico", "Dermocosmético" o "Suplemento/Nutrición" para productos que no son fármacos clásicos.
- No inventes principios activos.
- confidence debe estar entre 0 y 1.
- Mantén el mismo nombre exacto de entrada.

Productos:
${JSON.stringify(batch, null, 2)}`

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed.items) ? parsed.items : []
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Falta OPENAI_API_KEY en el entorno')
  }

  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`No se encontró el dump: ${INPUT_FILE}`)
  }

  const payload = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
  const records = Array.isArray(payload.records) ? payload.records : []
  const cache = loadCache()
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const pending = records
    .map((record, index) => {
      const classified = classifyVademecumRecord(record, index)
      if (!classified || classified.familia !== 'Otro') return null
      return {
        nombre: classified.nombre,
        context: buildContext(record),
      }
    })
    .filter(Boolean)

  console.log(`🧠 Casos pendientes para IA: ${pending.length}`)

  const unresolved = pending.filter(item => !cache[item.nombre])
  console.log(`📌 Casos sin cache: ${unresolved.length}`)

  for (let offset = 0; offset < unresolved.length; offset += BATCH_SIZE) {
    const batch = unresolved.slice(offset, offset + BATCH_SIZE)
    if (!batch.length) continue

    const result = await classifyBatch(client, batch)
    for (const item of result) {
      if (!item || !item.nombre) continue
      cache[item.nombre] = {
        familia: ALLOWED_FAMILIES.includes(item.familia) ? item.familia : 'Otro',
        confidence: Number.isFinite(Number(item.confidence)) ? Number(item.confidence) : 0,
        reason: cleanText(item.reason, ''),
      }
    }

    saveCache(cache)
    console.log(`✅ IA: ${Math.min(offset + batch.length, unresolved.length)}/${unresolved.length}`)
  }

  const updates = pending
    .map(item => ({
      nombre: item.nombre,
      ...(cache[item.nombre] || { familia: 'Otro', confidence: 0, reason: '' }),
    }))
    .filter(item => item.familia && item.familia !== 'Otro' && item.confidence >= MIN_CONFIDENCE)

  fs.writeFileSync(OUTPUT_FILE, buildSql(updates))

  const summary = updates.reduce((acc, item) => {
    acc[item.familia] = (acc[item.familia] || 0) + 1
    return acc
  }, {})

  console.log(`📄 SQL generado: ${OUTPUT_FILE}`)
  console.log(`📝 Reclasificaciones aplicables: ${updates.length}`)
  console.log('📊 Resumen:', summary)
}

main().catch(error => {
  console.error('❌ Error IA reclasificando Vademecum Chile:', error)
  process.exitCode = 1
})
