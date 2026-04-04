/* eslint-disable @typescript-eslint/no-require-imports */
const OpenAI = require('openai')
require('dotenv').config()

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function parseJSON(raw) {
  const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  return JSON.parse(clean)
}

function toArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value).split(/[;|\n]+/).map(s => s.trim()).filter(Boolean)
}

function normalizeInteracciones(value) {
  if (!value) return 'Moderadas'
  const v = String(value).toLowerCase()
  if (v.includes('poc') || v.includes('few') || v.includes('baj')) return 'Pocas'
  if (v.includes('much') || v.includes('many') || v.includes('alt') || v.includes('numer')) return 'Muchas'
  return 'Moderadas'
}

function resolveClinicalCategory(familia, principioActivo) {
  const source = `${familia} ${principioActivo}`.toLowerCase()

  if (['ieca', 'ara-ii', 'ara ii', 'bloqueador de canales de calcio', 'betabloqueador', 'diurético', 'diuretico', 'vasodilatador']
    .some(term => source.includes(term))) {
    return 'antihipertensivo'
  }

  if (['antidiabético', 'antidiabetico', 'diabetes', 'insulina', 'hipoglucemiante']
    .some(term => source.includes(term))) {
    return 'antidiabético'
  }

  if (['aine', 'antiinflamatorio no esteroideo', 'antiinflamatorio no esteroidal']
    .some(term => source.includes(term))) {
    return 'aine'
  }

  if (['antibiótico', 'antibiotico', 'antibacteriano']
    .some(term => source.includes(term))) {
    return 'antibiótico'
  }

  if (source.includes('estatina')) {
    return 'estatina'
  }

  return 'otros'
}

async function extractWithAI(texto, nombre, principioActivo) {
  const prompt = `Eres un farmacólogo clínico experto. Analiza el texto sobre "${nombre}" (principio activo: ${principioActivo}) y extrae información farmacológica.

Texto de referencia:
"""${texto}"""

Responde SOLO con un JSON válido (sin markdown):
{
  "familia": "grupo farmacológico corto, ej: IECA, AINE, Betalactámico, Estatina",
  "categoriaClinica": "antihipertensivo | antidiabético | aine | antibiótico | estatina | otros",
  "indicaciones": ["indicación 1", "indicación 2"],
  "efectosAdversos": ["efecto 1", "efecto 2"],
  "contraindicaciones": ["contraindicación 1", "contraindicación 2"],
  "vidaMedia": "ej: 11 h, 35-50 h, 6-8 h",
  "nivelInteracciones": "Pocas | Moderadas | Muchas",
  "precioReferenciaClp": número entero en pesos chilenos o null
}

Reglas:
- Usa tu conocimiento de "${principioActivo}" si el texto es insuficiente.
- indicaciones, efectosAdversos, contraindicaciones: 3-7 ítems, máx 10 palabras cada uno.
- vidaMedia: dato farmacológico real del principio activo.
- nivelInteracciones: "Pocas" (<5 interacciones relevantes), "Moderadas" (5-15), "Muchas" (>15 o interacciones graves conocidas).
- precioReferenciaClp: precio típico en farmacia chilena para la presentación indicada (${nombre}). Si no tienes certeza razonable, usa null.
- Todo en español.`

  const res = await client.chat.completions.create({
    model: 'gpt-4.1',
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = res.choices[0].message.content
  const parsed = parseJSON(raw)

  return {
    familia:            parsed.familia            || '',
    categoriaClinica:   parsed.categoriaClinica    || resolveClinicalCategory(parsed.familia || '', principioActivo),
    indicaciones:       toArray(parsed.indicaciones),
    efectosAdversos:    toArray(parsed.efectosAdversos),
    contraindicaciones: toArray(parsed.contraindicaciones),
    vidaMedia:          parsed.vidaMedia          || null,
    nivelInteracciones: normalizeInteracciones(parsed.nivelInteracciones),
    precioReferencia:   typeof parsed.precioReferenciaClp === 'number' ? parsed.precioReferenciaClp : null,
  }
}

module.exports = { extractWithAI }
