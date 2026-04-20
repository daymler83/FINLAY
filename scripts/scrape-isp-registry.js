/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const path = require('node:path')

const ISP_URL = 'https://registrosanitario.ispch.gob.cl/'

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields.map(field => field.trim())
}

function toCsvLine(values) {
  return values
    .map((raw) => {
      const value = String(raw ?? '')
      if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    .join(',')
}

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function extractHidden(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`name="${escaped}"[^>]*value="([^"]*)"`, 'i'))
  return match ? decodeHtmlEntities(match[1]) : ''
}

function extractSetCookie(headers) {
  const raw = headers.get('set-cookie')
  if (!raw) return ''
  return raw.split(',').map(chunk => chunk.split(';')[0].trim()).join('; ')
}

function mergeCookie(existing, incoming) {
  const jar = new Map()
  const read = (cookieString) => {
    for (const part of String(cookieString || '').split(';')) {
      const item = part.trim()
      if (!item) continue
      const eq = item.indexOf('=')
      if (eq < 1) continue
      const key = item.slice(0, eq).trim()
      const val = item.slice(eq + 1).trim()
      jar.set(key, val)
    }
  }

  read(existing)
  read(incoming)
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function extractRows(html) {
  const rows = []
  const rowRegex = /gvDatosBusqueda_ctl(\d+)_lblProducto">([^<]*)<\/span>[\s\S]*?gvDatosBusqueda_ctl\1_lblNombre">([^<]*)<\/span>[\s\S]*?gvDatosBusqueda_ctl\1_lblFechaRegistro">([^<]*)<\/span>[\s\S]*?gvDatosBusqueda_ctl\1_lblTitular">([^<]*)<\/span>[\s\S]*?gvDatosBusqueda_ctl\1_lblPA">([^<]*)<\/span>/g
  let match

  while ((match = rowRegex.exec(html)) !== null) {
    rows.push({
      registro: decodeHtmlEntities(match[2]),
      nombre: decodeHtmlEntities(match[3]),
      fechaRegistro: decodeHtmlEntities(match[4]),
      titular: decodeHtmlEntities(match[5]),
      principioActivo: decodeHtmlEntities(match[6]),
    })
  }

  return rows
}

function scoreCandidate(input, candidate) {
  const normalizedName = normalize(input.nombre)
  const normalizedLab = normalize(input.laboratorio)
  const normalizedPresentation = normalize(input.presentacion)
  const normalizedPA = normalize(input.principioActivo)

  const candidateName = normalize(candidate.nombre)
  const candidateLab = normalize(candidate.titular)
  const candidatePA = normalize(candidate.principioActivo)

  let score = 0

  if (normalizedLab && candidateLab.includes(normalizedLab)) score += 40
  if (normalizedPA && candidatePA.includes(normalizedPA)) score += 25

  if (normalizedPresentation) {
    const tokens = normalizedPresentation.split(' ').filter(t => t.length >= 2)
    const matches = tokens.filter(t => candidateName.includes(t)).length
    score += matches * 5
  }

  if (normalizedName) {
    const tokens = normalizedName.split(' ').filter(t => t.length >= 3)
    const matches = tokens.filter(t => candidateName.includes(t)).length
    score += matches * 6

    if (candidateName.includes(normalizedName)) score += 30
  }

  // Small preference for currently valid-like format (example: F-12345/26)
  if (/^[A-Z]-\d+\/\d+$/i.test(candidate.registro)) score += 5

  return score
}

function pickBestCandidate(input, rows) {
  if (!rows.length) return null
  let best = rows[0]
  let bestScore = scoreCandidate(input, best)
  for (const row of rows.slice(1)) {
    const score = scoreCandidate(input, row)
    if (score > bestScore) {
      best = row
      bestScore = score
    }
  }
  return { ...best, _score: bestScore }
}

async function fetchInitialState(cookie) {
  const res = await fetch(ISP_URL, {
    headers: cookie ? { Cookie: cookie } : undefined,
  })
  const html = await res.text()
  const newCookie = extractSetCookie(res.headers)
  return {
    html,
    cookie: mergeCookie(cookie, newCookie),
    hidden: {
      __VIEWSTATE: extractHidden(html, '__VIEWSTATE'),
      __VIEWSTATEGENERATOR: extractHidden(html, '__VIEWSTATEGENERATOR'),
      __VIEWSTATEENCRYPTED: extractHidden(html, '__VIEWSTATEENCRYPTED'),
      __EVENTVALIDATION: extractHidden(html, '__EVENTVALIDATION'),
    },
  }
}

async function postForm({ cookie, hidden, extraData }) {
  const params = new URLSearchParams({
    __EVENTTARGET: '',
    __EVENTARGUMENT: '',
    __LASTFOCUS: '',
    __VIEWSTATE: hidden.__VIEWSTATE || '',
    __VIEWSTATEGENERATOR: hidden.__VIEWSTATEGENERATOR || '',
    __VIEWSTATEENCRYPTED: hidden.__VIEWSTATEENCRYPTED || '',
    __EVENTVALIDATION: hidden.__EVENTVALIDATION || '',
    ...extraData,
  })

  const res = await fetch(ISP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: params.toString(),
  })

  const html = await res.text()
  const newCookie = extractSetCookie(res.headers)
  return {
    html,
    cookie: mergeCookie(cookie, newCookie),
    hidden: {
      __VIEWSTATE: extractHidden(html, '__VIEWSTATE'),
      __VIEWSTATEGENERATOR: extractHidden(html, '__VIEWSTATEGENERATOR'),
      __VIEWSTATEENCRYPTED: extractHidden(html, '__VIEWSTATEENCRYPTED'),
      __EVENTVALIDATION: extractHidden(html, '__EVENTVALIDATION'),
    },
  }
}

async function searchByField({ query, stateValue = 'Sí', fieldType }) {
  // fieldType: 0 = nombre producto, 1 = principio activo
  const fieldConfig = fieldType === 1
    ? {
      checkboxName: 'ctl00$ContentPlaceHolder1$chkTipoBusqueda$1',
      inputName: 'ctl00$ContentPlaceHolder1$txtPrincipio',
    }
    : {
      checkboxName: 'ctl00$ContentPlaceHolder1$chkTipoBusqueda$0',
      inputName: 'ctl00$ContentPlaceHolder1$txtNombreProducto',
    }

  let state = await fetchInitialState('')

  // Step 1: activate selected search type (required by ASP.NET event validation)
  state = await postForm({
    cookie: state.cookie,
    hidden: state.hidden,
    extraData: {
      __EVENTTARGET: fieldConfig.checkboxName,
      [fieldConfig.checkboxName]: 'on',
    },
  })

  // Step 2: search
  state = await postForm({
    cookie: state.cookie,
    hidden: state.hidden,
    extraData: {
      [fieldConfig.checkboxName]: 'on',
      [fieldConfig.inputName]: query,
      'ctl00$ContentPlaceHolder1$ddlEstado': stateValue,
      'ctl00$ContentPlaceHolder1$btnBuscar': 'Buscar',
    },
  })

  if (/Argumento de postback/i.test(state.html) || /viewstate MAC failed/i.test(state.html)) {
    throw new Error('El sitio ISP rechazó la sesión de scraping (event validation / viewstate).')
  }

  return extractRows(state.html)
}

function readRows(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) {
    throw new Error('CSV sin datos')
  }

  const headers = parseCsvLine(lines[0])
  const idx = {
    nombre: headers.findIndex(h => normalize(h) === 'nombre'),
    principioActivo: headers.findIndex(h => normalize(h) === 'principioactivo'),
    presentacion: headers.findIndex(h => normalize(h) === 'presentacion'),
    laboratorio: headers.findIndex(h => normalize(h) === 'laboratorio'),
    registroIsp: headers.findIndex(h => normalize(h) === 'registroisp'),
    estadoRegistroIsp: headers.findIndex(h => normalize(h) === 'estadoregistroisp'),
    titularRegistroIsp: headers.findIndex(h => normalize(h) === 'titularregistroisp'),
  }

  if (idx.nombre < 0) {
    throw new Error('El CSV debe incluir una columna "nombre".')
  }

  const rows = lines.slice(1).map((line, i) => {
    const fields = parseCsvLine(line)
    return {
      lineNumber: i + 2,
      raw: fields,
      nombre: (fields[idx.nombre] || '').trim(),
      principioActivo: idx.principioActivo >= 0 ? (fields[idx.principioActivo] || '').trim() : '',
      presentacion: idx.presentacion >= 0 ? (fields[idx.presentacion] || '').trim() : '',
      laboratorio: idx.laboratorio >= 0 ? (fields[idx.laboratorio] || '').trim() : '',
    }
  }).filter(row => row.nombre)

  return { headers, rows, idx }
}

async function main() {
  const inputArg = process.argv[2] || 'pipeline/data/isp-registro-template.csv'
  const outputArg = process.argv[3] || 'pipeline/data/isp-registro-scraped.csv'
  const limitArg = Number(process.argv[4] || '0')
  const delayMs = Number(process.env.ISP_SCRAPE_DELAY_MS || '1200')

  const inputPath = path.resolve(inputArg)
  const outputPath = path.resolve(outputArg)

  if (!fs.existsSync(inputPath)) {
    throw new Error(`No existe el archivo de entrada: ${inputPath}`)
  }

  const { headers, rows, idx } = readRows(inputPath)
  const selectedRows = limitArg > 0 ? rows.slice(0, limitArg) : rows

  const outputHeaders = [...headers]
  const ensureColumn = (column) => {
    const existing = outputHeaders.findIndex(h => normalize(h) === normalize(column))
    if (existing >= 0) return existing
    outputHeaders.push(column)
    return outputHeaders.length - 1
  }

  const outIndex = {
    registroIsp: ensureColumn('registroIsp'),
    estadoRegistroIsp: ensureColumn('estadoRegistroIsp'),
    titularRegistroIsp: ensureColumn('titularRegistroIsp'),
    ispMatchName: ensureColumn('ispMatchName'),
    ispMatchPA: ensureColumn('ispMatchPA'),
    ispMatchFechaRegistro: ensureColumn('ispMatchFechaRegistro'),
    ispMatchScore: ensureColumn('ispMatchScore'),
    ispMatchSource: ensureColumn('ispMatchSource'),
  }

  const outputLines = [toCsvLine(outputHeaders)]
  let matched = 0

  for (let i = 0; i < selectedRows.length; i++) {
    const row = selectedRows[i]
    process.stdout.write(`Procesando ${i + 1}/${selectedRows.length}: ${row.nombre}\n`)

    let candidates = []
    let source = 'nombre'

    try {
      candidates = await searchByField({ query: row.nombre, fieldType: 0 })
    } catch (err) {
      process.stdout.write(`  Aviso: fallo búsqueda por nombre (${String(err?.message || err)})\n`)
    }

    if (candidates.length === 0 && row.principioActivo) {
      source = 'principioActivo'
      try {
        candidates = await searchByField({ query: row.principioActivo, fieldType: 1 })
      } catch (err) {
        process.stdout.write(`  Aviso: fallo búsqueda por principio activo (${String(err?.message || err)})\n`)
      }
    }

    const best = pickBestCandidate(row, candidates)
    if (best) matched++

    const out = [...row.raw]
    while (out.length < outputHeaders.length) out.push('')
    out[outIndex.registroIsp] = best?.registro ?? (idx.registroIsp >= 0 ? (row.raw[idx.registroIsp] || '') : '')
    out[outIndex.estadoRegistroIsp] = best ? 'Vigente' : (idx.estadoRegistroIsp >= 0 ? (row.raw[idx.estadoRegistroIsp] || '') : '')
    out[outIndex.titularRegistroIsp] = best?.titular ?? (idx.titularRegistroIsp >= 0 ? (row.raw[idx.titularRegistroIsp] || '') : '')
    out[outIndex.ispMatchName] = best?.nombre ?? ''
    out[outIndex.ispMatchPA] = best?.principioActivo ?? ''
    out[outIndex.ispMatchFechaRegistro] = best?.fechaRegistro ?? ''
    out[outIndex.ispMatchScore] = best?._score ?? ''
    out[outIndex.ispMatchSource] = best ? source : ''

    outputLines.push(toCsvLine(out))

    if (delayMs > 0) {
      await sleep(delayMs)
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${outputLines.join('\n')}\n`, 'utf8')

  console.log('')
  console.log(`Entrada: ${inputPath}`)
  console.log(`Salida:  ${outputPath}`)
  console.log(`Filas procesadas: ${selectedRows.length}`)
  console.log(`Coincidencias:    ${matched}`)
  console.log('Importa este CSV con: npm run import:isp:registro -- <archivo_salida>')
}

main().catch(err => {
  console.error('Error en scraping ISP:', err)
  process.exitCode = 1
})
