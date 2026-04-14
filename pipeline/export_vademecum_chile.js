/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
require('dotenv').config()

const BASE_URL = 'https://www.vademecum.es/chile/cl/alfa'
const OUTPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const CONCURRENCY = 12

const CATEGORY_MATCHERS = {
  antihipertensivo: [
    'ieca',
    'ara-ii',
    'ara ii',
    'bloqueador de canales de calcio',
    'betabloqueador',
    'diuretico',
    'diurético',
    'vasodilatador',
  ],
  antidiabético: [
    'antidiabético',
    'antidiabetico',
    'diabetes',
    'insulina',
    'hipoglucemiante',
  ],
  aine: [
    'aine',
    'antiinflamatorio no esteroideo',
    'antiinflamatorio no esteroidal',
  ],
  antibiótico: [
    'antibiótico',
    'antibiotico',
    'antibacteriano',
  ],
  estatina: ['estatina'],
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getClinicalCategory(familia, principioActivo) {
  const source = normalize(`${familia} ${principioActivo}`)
  for (const [category, matchers] of Object.entries(CATEGORY_MATCHERS)) {
    if (matchers.some(term => source.includes(term))) {
      return category
    }
  }
  return 'otros'
}

function familyFromAtcCode(atcCode) {
  const code = String(atcCode || '').trim().toUpperCase()
  const first = code[0]
  switch (first) {
    case 'A': return 'Sistema alimentario y metabolismo'
    case 'B': return 'Sangre y órganos hematopoyéticos'
    case 'C': return 'Sistema cardiovascular'
    case 'D': return 'Dermatológicos'
    case 'G': return 'Sistema genitourinario y hormonas sexuales'
    case 'H': return 'Hormonas sistémicas'
    case 'J': return 'Antiinfecciosos sistémicos'
    case 'L': return 'Antineoplásicos e inmunomoduladores'
    case 'M': return 'Sistema musculoesquelético'
    case 'N': return 'Sistema nervioso'
    case 'P': return 'Antiparasitarios, insecticidas y repelentes'
    case 'R': return 'Sistema respiratorio'
    case 'S': return 'Órganos de los sentidos'
    case 'V': return 'Varios'
    default: return 'Otro'
  }
}

async function fetchHtml(url, retries = 2) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 30000,
      })
      return data
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await sleep(500 * (attempt + 1))
      }
    }
  }

  throw lastError
}

function absUrl(href, base) {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

async function crawlIndexPages() {
  const queue = [BASE_URL]
  const visited = new Set()
  const productUrls = new Set()

  while (queue.length) {
    const url = queue.shift()
    if (!url || visited.has(url)) continue
    visited.add(url)

    console.log(`🔎 Índice: ${url}`)
    const html = await fetchHtml(url)
    const $ = cheerio.load(html)

    $('a[href]').each((_, a) => {
      const href = $(a).attr('href')
      if (!href) return

      const absolute = absUrl(href, url)
      if (!absolute) return

      if (absolute.includes('/chile/medicamento/')) {
        productUrls.add(absolute.split('#')[0])
        return
      }

      if (absolute.toLowerCase().startsWith('https://www.vademecum.es/chile/cl/alfa')) {
        const normalized = absolute.split('#')[0].replace(/\/+$/, '')
        if (!visited.has(normalized) && !queue.includes(normalized)) {
          queue.push(normalized)
        }
      }
    })

    await sleep(150)
  }

  return Array.from(productUrls)
}

function parseSectionList($, headingLabel) {
  const result = {}

  $('h2').each((_, h2) => {
    const rawHeading = $(h2).text().replace(/\s+/g, ' ').trim()
    const heading = rawHeading.replace(headingLabel, '').trim()
    if (!heading) return

    const contentPieces = []
    $(h2)
      .nextUntil('h2')
      .each((__, node) => {
        const text = $(node).text().replace(/\s+/g, ' ').trim()
        if (text) contentPieces.push(text)
      })

    const content = contentPieces.join(' ').replace(/\s+/g, ' ').trim()
    if (content) {
      result[heading] = content
    }
  })

  return result
}

function extractBetween(text, startLabel, endLabel) {
  const source = String(text || '')
  const pattern = new RegExp(
    `${startLabel}\\s*:?\\s*(.*?)\\s*(?:${endLabel}|$)`,
    'i'
  )
  const match = source.match(pattern)
  return match ? match[1].replace(/\s+/g, ' ').trim() : ''
}

function parseMedicinePage(html, url) {
  const $ = cheerio.load(html)
  $('script,style,noscript,iframe').remove()

  const title = $('h1').first().text().replace(/\s+/g, ' ').trim()
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
  const relevantText = (() => {
    const titleIndex = bodyText.indexOf(title)
    return titleIndex >= 0 ? bodyText.slice(titleIndex) : bodyText
  })()
  const atcMatch = relevantText.match(/ATC:\s*([^(]+?)\s*\(([A-Z0-9]+)\)/i)
  const atcLabel = atcMatch ? atcMatch[1].replace(/\s+/g, ' ').trim() : ''
  const atcCode = atcMatch ? atcMatch[2].toUpperCase() : ''
  const principioActivo = atcLabel.split(',')[0].trim() || title
  const localName = extractBetween(relevantText, 'Nombre local', 'País') || title
  const pais = extractBetween(relevantText, 'País', 'Laboratorio') || 'Chile'
  const laboratorio = extractBetween(relevantText, 'Laboratorio', 'Registro sanitario')
  const registroSanitario = extractBetween(relevantText, 'Registro sanitario', 'Vía')
  const via = extractBetween(relevantText, 'Vía', 'Forma')
  const forma = extractBetween(relevantText, 'Forma', 'ATC')

  const sectionMap = parseSectionList($, atcLabel || principioActivo || title)

  const indicaciones = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('indicaciones terapéuticas'))
    .map(([, content]) => content)

  const contraindicaciones = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('contraindicaciones'))
    .map(([, content]) => content)

  const interacciones = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('interacciones'))
    .map(([, content]) => content)

  const reaccionesAdversas = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('reacciones adversas'))
    .map(([, content]) => content)

  const advertenciasPrecauciones = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('advertencias y precauciones'))
    .map(([, content]) => content)

  const embarazo = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('embarazo'))
    .map(([, content]) => content)

  const lactancia = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('lactancia'))
    .map(([, content]) => content)

  const posologia = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('posología') || heading.toLowerCase().startsWith('posologia'))
    .map(([, content]) => content)

  const modoAdministracion = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('modo de administración') || heading.toLowerCase().startsWith('modo de administracion'))
    .map(([, content]) => content)

  const mecanismoAccion = Object.entries(sectionMap)
    .filter(([heading]) => heading.toLowerCase().startsWith('mecanismo de acción') || heading.toLowerCase().startsWith('mecanismo de accion'))
    .map(([, content]) => content)

  const familia = familyFromAtcCode(atcCode)
  const categoriaClinica = getClinicalCategory(familia, principioActivo)

  return {
    sourceUrl: url,
    nombre: title || localName || atcLabel,
    nombreLocal: localName || title,
    pais,
    laboratorio: laboratorio || 'Vademecum Chile',
    registroSanitario,
    via,
    forma,
    atc: {
      label: atcLabel,
      code: atcCode,
      url: absUrl(atcAnchor.attr('href'), url) || '',
    },
    principioActivo,
    familia,
    categoriaClinica,
    indicaciones,
    contraindicaciones,
    interacciones,
    reaccionesAdversas,
    advertenciasPrecauciones,
    embarazo,
    lactancia,
    posologia,
    modoAdministracion,
    mecanismoAccion,
    sections: sectionMap,
  }
}

async function main() {
  console.log('🌱 Descargando catálogo de Vademecum Chile...')

  const productUrls = await crawlIndexPages()
  console.log(`📋 ${productUrls.length} fichas detectadas`)

  const records = []
  const seenNames = new Set()
  let ok = 0
  let skipped = 0

  let nextIndex = 0
  async function worker(workerId) {
    while (true) {
      const currentIndex = nextIndex++
      if (currentIndex >= productUrls.length) return

      const url = productUrls[currentIndex]
      try {
        const html = await fetchHtml(url)
        const record = parseMedicinePage(html, url)

        if (!record.nombre) {
          skipped++
          console.log(`⏳ [${currentIndex + 1}/${productUrls.length}] W${workerId} sin nombre`)
          continue
        }

        const key = normalize(record.nombre)
        if (seenNames.has(key)) {
          continue
        }

        seenNames.add(key)
        records.push(record)
        ok++
        console.log(`✅ [${currentIndex + 1}/${productUrls.length}] ${record.nombre}`)
      } catch (error) {
        skipped++
        console.log(`❌ [${currentIndex + 1}/${productUrls.length}] ${url} :: ${error.message}`)
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1))
  await Promise.all(workers)

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    source: 'Vademecum Chile',
    baseUrl: BASE_URL,
    downloadedAt: new Date().toISOString(),
    totalDetected: productUrls.length,
    totalSaved: records.length,
    records,
  }, null, 2), 'utf8')

  console.log(`\n✔ Exportación terminada: ${ok} guardados, ${skipped} omitidos`)
  console.log(`📦 Archivo: ${OUTPUT_FILE}`)
}

main().catch(error => {
  console.error('❌ Error en exportación:', error)
  process.exit(1)
})
