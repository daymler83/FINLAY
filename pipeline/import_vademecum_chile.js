/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()
const INPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/g, (_, first, rest) => first.toUpperCase() + rest)
}

function extractSectionText(record) {
  const sections = record && typeof record.sections === 'object' ? record.sections : {}
  return Object.values(sections)
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .map(item => String(item || ''))
    .join(' ')
}

function looksBroken(value) {
  const text = String(value || '').trim()
  if (!text) return true
  if (text.length > 120) return true
  return /^(?:s\s+)?indicaciones|^para acceder a la base de datos|^vademecum|^image:/i.test(text)
}

function cleanText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (looksBroken(text)) return fallback
  return text
}

function cleanArray(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(item => cleanText(item))
        .filter(Boolean)
    )
  )
}

function resolvePriceReference(record) {
  const raw = record.precioReferencia
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const CATEGORY_RULES = [
  {
    category: 'antihipertensivo',
    family: 'IECA',
    terms: ['enalapril', 'captopril', 'lisinopril', 'ramipril', 'perindopril', 'quinapril'],
  },
  {
    category: 'antihipertensivo',
    family: 'ARA-II',
    terms: ['losartan', 'valsartan', 'olmesartan', 'telmisartan', 'candesartan', 'irbesartan'],
  },
  {
    category: 'antihipertensivo',
    family: 'Betabloqueador',
    terms: ['atenolol', 'metoprolol', 'bisoprolol', 'carvedilol', 'propranolol', 'nebivolol', 'labetalol'],
  },
  {
    category: 'antihipertensivo',
    family: 'Bloqueador de canales de calcio',
    terms: ['amlodipino', 'nifedipino', 'verapamilo', 'diltiazem', 'felodipino', 'lercanidipino'],
  },
  {
    category: 'antihipertensivo',
    family: 'Diurético',
    terms: ['furosemida', 'hidroclorotiazida', 'clortalidona', 'indapamida', 'espironolactona', 'torasemida'],
  },
  {
    category: 'antidiabético',
    family: 'Antidiabético',
    terms: ['metformina', 'insulina', 'sitagliptina', 'linagliptina', 'empagliflozina', 'dapagliflozina', 'semaglutida', 'liraglutida', 'dulaglutida', 'vildagliptina', 'repaglinida', 'gliclazida', 'glimepirida', 'pioglitazona', 'acarbosa'],
  },
  {
    category: 'aine',
    family: 'AINE',
    terms: ['ibuprofeno', 'diclofenaco', 'naproxeno', 'ketorolaco', 'meloxicam', 'celecoxib', 'dexketoprofeno', 'indometacina', 'etoricoxib', 'piroxicam', 'aceclofenaco', 'ketoprofeno', 'flurbiprofeno'],
  },
  {
    category: 'antibiótico',
    family: 'Antibiótico',
    terms: ['amoxicilina', 'clavulanico', 'cefalexina', 'cefuroxima', 'cefixima', 'azitromicina', 'claritromicina', 'ciprofloxacino', 'levofloxacino', 'metronidazol', 'clindamicina', 'doxiciclina', 'tetraciclina', 'meropenem', 'vancomicina', 'linezolid', 'piperacilina', 'tazobactam', 'sulfametoxazol', 'trimetoprim'],
  },
  {
    category: 'estatina',
    family: 'Estatina',
    terms: ['atorvastatina', 'rosuvastatina', 'simvastatina', 'pravastatina', 'lovastatina', 'fluvastatina', 'pitavastatina'],
  },
]

function buildSearchText(record) {
  const textParts = [
    record.nombre,
    record.nombreLocal,
    record.principioActivo,
    record.familia,
    record.categoriaClinica,
    record.via,
    record.forma,
    record.registroSanitario,
    record.laboratorio,
    record.indicaciones,
    record.contraindicaciones,
    record.interacciones,
    record.reaccionesAdversas,
    record.advertenciasPrecauciones,
    record.embarazo,
    record.lactancia,
    record.posologia,
    record.modoAdministracion,
    record.mecanismoAccion,
    extractSectionText(record),
  ]

  return normalize(textParts.flat().join(' '))
}

function resolveCategoryAndFamily(record) {
  const searchText = buildSearchText(record)

  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some(term => searchText.includes(term))) {
      return { category: rule.category, family: rule.family, matchedTerm: rule.terms.find(term => searchText.includes(term)) }
    }
  }

  return { category: 'otros', family: 'Otro', matchedTerm: '' }
}

function resolvePrincipioActivo(record, categoryInfo) {
  const title = cleanText(record.nombre, '')
  const explicit = cleanText(record.principioActivo, '')
  if (explicit && !/^principios activos$/i.test(explicit)) return explicit

  const searchText = buildSearchText(record)
  const terms = [...CATEGORY_RULES.flatMap(rule => rule.terms), 'baclofeno', 'pantoprazol', 'omeprazol', 'esomeprazol', 'morfina', 'tramadol', 'paracetamol', 'prednisona', 'dexametasona', 'testosterona', 'levotiroxina']

  for (const term of terms) {
    if (searchText.includes(term)) {
      return titleCase(term)
    }
  }

  const stripped = title
    .replace(/\b(?:soluci[oó]n|comprimidos|c[aá]psulas|capsulas|jarabe|polvo|g[eé]l|crema|ung[uú]ento|suspensi[oó]n|liofilizado|aerosol|spray|tabletas|gr[aá]nulos|emulsi[oó]n|parche|óvulos|ovulos|supositorios|laca|loci[oó]n|gotas|sachet|sachets|vial|ampolla|implante|sistema|film|pasta)\b.*$/i, '')
    .replace(/\s*[-/]\s*$/, '')
    .trim()

  if (stripped) return stripped

  return categoryInfo.category === 'otros' ? title : categoryInfo.family
}

function resolvePresentacion(record) {
  const form = cleanText(record.forma, '')
  const via = cleanText(record.via, '')
  const title = cleanText(record.nombre, '')
  const pieces = [form, via].filter(Boolean)
  return pieces.length ? pieces.join(' - ') : title
}

function resolveLaboratorio(record) {
  const lab = cleanText(record.laboratorio, '')
  return lab || 'Vademecum Chile'
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`No se encontró el dump: ${INPUT_FILE}`)
  }

  const payload = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
  const records = Array.isArray(payload.records) ? payload.records : []

  console.log(`📦 Registros en dump: ${records.length}`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    const nombre = cleanText(record.nombre, '')

    if (!nombre) {
      skipped += 1
      continue
    }

    const categoryInfo = resolveCategoryAndFamily(record)

    const data = {
      nombre,
      principioActivo: resolvePrincipioActivo(record, categoryInfo),
      familia: categoryInfo.family,
      presentacion: resolvePresentacion(record),
      laboratorio: resolveLaboratorio(record),
      precioReferencia: resolvePriceReference(record),
      vidaMedia: cleanText(record.vidaMedia, null),
      nivelInteracciones: cleanText(record.nivelInteracciones, null),
      efectosAdversos: cleanArray(record.efectosAdversos),
      contraindicaciones: cleanArray(record.contraindicaciones),
      indicaciones: cleanArray(record.indicaciones),
    }

    const existing = await prisma.medicamento.findUnique({
      where: { nombre },
      select: { id: true },
    })

    await prisma.medicamento.upsert({
      where: { nombre },
      create: data,
      update: data,
    })

    if (existing) {
      updated += 1
    } else {
      created += 1
    }

    if ((index + 1) % 100 === 0 || index === records.length - 1) {
      console.log(`✅ [${index + 1}/${records.length}] ${nombre}`)
    }
  }

  console.log(`\n✔ Importación terminada: ${created} creados, ${updated} actualizados, ${skipped} omitidos`)
}

main()
  .catch(error => {
    console.error('❌ Importación fallida:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
