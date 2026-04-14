/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const INPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')
const OUTPUT_FILE = path.join('/tmp', 'vademecum-chile-import.sql')
const BATCH_SIZE = 250

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

function cleanText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  if (text.length > 120) return fallback
  if (/^(?:s\s+)?indicaciones|^para acceder a la base de datos|^vademecum|^image:/i.test(text)) return fallback
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

function extractSectionText(record) {
  const sections = record && typeof record.sections === 'object' ? record.sections : {}
  return Object.values(sections)
    .flatMap(value => (Array.isArray(value) ? value : [value]))
    .map(item => String(item || ''))
    .join(' ')
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
      return rule
    }
  }
  return { category: 'otros', family: 'Otro', terms: [] }
}

function resolvePrincipioActivo(record, categoryInfo) {
  const explicit = cleanText(record.principioActivo, '')
  if (explicit && !/^principios activos$/i.test(explicit)) return explicit

  const searchText = buildSearchText(record)
  const terms = [
    ...CATEGORY_RULES.flatMap(rule => rule.terms),
    'baclofeno',
    'pantoprazol',
    'omeprazol',
    'esomeprazol',
    'morfina',
    'tramadol',
    'paracetamol',
    'prednisona',
    'dexametasona',
    'testosterona',
    'levotiroxina',
    'ticagrelor',
    'clopidogrel',
    'rivaroxaban',
    'apixaban',
    'dabigatran',
    'rosiglitazona',
    'tirzepatida',
    'liraglutida',
    'semaglutida',
    'insulina glargina',
  ]

  for (const term of terms) {
    if (searchText.includes(term)) {
      return titleCase(term)
    }
  }

  const title = cleanText(record.nombre, '')
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

function sqlQuote(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

function sqlTextArray(values) {
  const items = cleanArray(values)
  if (!items.length) return 'ARRAY[]::text[]'
  return `ARRAY[${items.map(sqlQuote).join(', ')}]::text[]`
}

function sqlNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? String(num) : 'NULL'
}

function buildRow(record) {
  const categoryInfo = resolveCategoryAndFamily(record)
  const nombre = cleanText(record.nombre, '')
  if (!nombre) return null

  return {
    nombre,
    principioActivo: resolvePrincipioActivo(record, categoryInfo),
    familia: categoryInfo.family,
    presentacion: resolvePresentacion(record),
    laboratorio: resolveLaboratorio(record),
    precioReferencia: sqlNumber(record.precioReferencia),
    vidaMedia: sqlQuote(cleanText(record.vidaMedia, null)),
    nivelInteracciones: sqlQuote(cleanText(record.nivelInteracciones, null)),
    efectosAdversos: sqlTextArray(record.efectosAdversos),
    contraindicaciones: sqlTextArray(record.contraindicaciones),
    indicaciones: sqlTextArray(record.indicaciones),
  }
}

function buildInsert(rows) {
  const values = rows
    .map(row => `(${[
      sqlQuote(row.nombre),
      sqlQuote(row.principioActivo),
      sqlQuote(row.familia),
      sqlQuote(row.presentacion),
      sqlQuote(row.laboratorio),
      row.precioReferencia,
      row.vidaMedia,
      row.nivelInteracciones,
      row.efectosAdversos,
      row.contraindicaciones,
      row.indicaciones,
    ].join(', ')})`)
    .join(',\n')

  return `
INSERT INTO "Medicamento" (
  "nombre",
  "principioActivo",
  "familia",
  "presentacion",
  "laboratorio",
  "precioReferencia",
  "vidaMedia",
  "nivelInteracciones",
  "efectosAdversos",
  "contraindicaciones",
  "indicaciones"
) VALUES
${values}
ON CONFLICT ("nombre") DO UPDATE SET
  "principioActivo" = EXCLUDED."principioActivo",
  "familia" = EXCLUDED."familia",
  "presentacion" = EXCLUDED."presentacion",
  "laboratorio" = EXCLUDED."laboratorio",
  "precioReferencia" = EXCLUDED."precioReferencia",
  "vidaMedia" = EXCLUDED."vidaMedia",
  "nivelInteracciones" = EXCLUDED."nivelInteracciones",
  "efectosAdversos" = EXCLUDED."efectosAdversos",
  "contraindicaciones" = EXCLUDED."contraindicaciones",
  "indicaciones" = EXCLUDED."indicaciones",
  "updatedAt" = NOW();
`
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`No se encontró el dump: ${INPUT_FILE}`)
  }

  const payload = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
  const records = Array.isArray(payload.records) ? payload.records : []
  const rows = records.map(buildRow).filter(Boolean)

  let sql = `BEGIN;\n`
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    sql += buildInsert(rows.slice(i, i + BATCH_SIZE))
  }
  sql += `COMMIT;\n`

  fs.writeFileSync(OUTPUT_FILE, sql)
  console.log(`📄 SQL generado: ${OUTPUT_FILE}`)
  console.log(`📦 Registros preparados: ${rows.length}`)
}

main()
