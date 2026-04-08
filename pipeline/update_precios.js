/**
 * FINLAY — Scraper de precios con Puppeteer
 * Actualiza precioReferencia en la DB para todos los medicamentos.
 * Uso: node pipeline/update_precios.js
 *      node pipeline/update_precios.js --nombre "Enalapril"   (solo uno)
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config()
const puppeteer = require('puppeteer')
const { PrismaClient } = require('@prisma/client')
const { sleep } = require('./utils')

const prisma = new PrismaClient()

const SALT_TERMS = [
  'maleato',
  'potasico',
  'potásico',
  'clorhidrato',
  'besilato',
  'sodica',
  'sódica',
  'sulfato',
  'cálcica',
  'calcica',
  'hidrocloruro',
  'hidratado',
  'anhidro',
  'base',
  'monohidrato',
  'dihidrato',
]

const PHARMACIES = [
  {
    name: 'Cruz Verde',
    url: query => `https://www.cruzverde.cl/busqueda?query=${query}`,
  },
  {
    name: 'Farmacias Ahumada',
    url: query => `https://www.farmaciasahumada.cl/search?q=${query}`,
  },
  {
    name: 'Salcobrand',
    url: query => `https://salcobrand.cl/results?query=${query}`,
  },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripDoseTerms(value) {
  return String(value || '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|gr|ml|ui|u|cp|comp|caps|capsulas?|comprimidos?)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
}

function stripSaltTerms(value) {
  const normalized = normalizeText(value)
  const withoutSalt = normalized
    .split(' ')
    .filter(token => token && !SALT_TERMS.includes(token))
    .join(' ')

  return withoutSalt.replace(/\s+/g, ' ').trim()
}

function extractDoseInfo(value) {
  const normalized = normalizeText(value)
  const match = normalized.match(/\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|g|gr|ml|ui|u)\b/)
  if (!match) return null

  return {
    amount: match[1].replace(',', '.'),
    unit: match[2],
    token: `${match[1].replace(',', '.')} ${match[2]}`,
  }
}

function buildSearchQueries(medicamento) {
  const dose = extractDoseInfo(medicamento.presentacion)
  const inputs = [
    medicamento.principioActivo,
    medicamento.nombre,
  ]

  const queries = []

  for (const input of inputs) {
    const base = stripSaltTerms(stripDoseTerms(input))
    if (base.length >= 3 && !queries.includes(base)) {
      queries.push(base)
    }

    if (dose) {
      const withDose = `${base} ${dose.token}`.trim()
      if (withDose.length >= 3 && !queries.includes(withDose)) {
        queries.unshift(withDose)
      }
    }
  }

  if (queries.length === 0) {
    const fallback = stripSaltTerms(stripDoseTerms(medicamento.presentacion))
    if (fallback.length >= 3) {
      queries.push(fallback)
    }
  }

  const compactActive = stripSaltTerms(stripDoseTerms(medicamento.principioActivo))
  if (compactActive.length >= 3 && !queries.includes(compactActive)) {
    queries.unshift(compactActive)
  }

  return queries.slice(0, 3)
}

function parsePrice(raw) {
  if (!raw) return null

  const text = String(raw)
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')

  const candidates = [
    ...text.matchAll(/(?:clp|\$)\s*([0-9][0-9.\s]*)(?:,[0-9]{1,2})?/gi),
    ...text.matchAll(/\b([0-9]{1,3}(?:[.\s][0-9]{3})+(?:,[0-9]{1,2})?)\b/g),
    ...text.matchAll(/\b([0-9]{3,7})\b/g),
  ].map(match => match[1]).filter(Boolean)

  for (const candidate of candidates) {
    const num = parseInt(candidate.replace(/[^\d]/g, ''), 10)
    if (Number.isFinite(num) && num >= 100 && num <= 500000) {
      return num
    }
  }

  return null
}

function extractPresentationHints(presentacion) {
  const normalized = normalizeText(presentacion)
  const hints = []
  const dose = extractDoseInfo(normalized)

  if (dose) {
    hints.push(dose.amount)
    hints.push(dose.unit)
    hints.push(dose.token)
  }

  if (normalized.includes('comprimido')) hints.push('comprimido')
  if (normalized.includes('capsula')) hints.push('capsula')
  if (normalized.includes('aerosol')) hints.push('aerosol')
  if (normalized.includes('suspension')) hints.push('suspension')

  return hints.filter(Boolean)
}

function scoreCandidate(candidate, medicamento, searchQueries) {
  const normalizedTitle = normalizeText(candidate.title)
  const normalizedText = normalizeText(`${candidate.title} ${candidate.text}`)
  const normalizedPrincipio = normalizeText(medicamento.principioActivo)
  const normalizedBase = stripSaltTerms(stripDoseTerms(medicamento.principioActivo))
  const presentationHints = extractPresentationHints(medicamento.presentacion)
  const expectedDose = extractDoseInfo(medicamento.presentacion)
  const candidateDose = extractDoseInfo(`${candidate.title} ${candidate.text}`)
  let score = 0

  if (normalizedTitle.includes(normalizedPrincipio)) score += 15
  if (normalizedText.includes(normalizedPrincipio)) score += 8
  if (normalizedTitle.includes(normalizedBase)) score += 45
  if (normalizedText.includes(normalizedBase)) score += 25

  for (const query of searchQueries) {
    if (query && normalizedText.includes(query)) score += 12
  }

  if (presentationHints.length > 0) {
    const matchedHints = presentationHints.filter(hint => normalizedText.includes(normalizeText(hint)))
    score += matchedHints.length * 6
  }

  if (candidate.href) score += 2
  if (candidate.priceCount > 1) score += 2

  if (expectedDose) {
    if (candidateDose) {
      if (candidateDose.amount === expectedDose.amount && candidateDose.unit === expectedDose.unit) {
        score += 35
      } else if (candidateDose.unit === expectedDose.unit) {
        score -= 35
      } else {
        score -= 15
      }
    } else {
      score -= 20
    }
  }

  if (/\b(pack|combo|kit|promo|muestra|sample)\b/.test(normalizedText)) score -= 8
  if (/\b(vitamina|suplemento|cosmetico)\b/.test(normalizedText)) score -= 20

  return {
    score,
    exactDoseMatch: Boolean(expectedDose && candidateDose &&
      candidateDose.amount === expectedDose.amount &&
      candidateDose.unit === expectedDose.unit),
  }
}

async function collectCandidates(page) {
  return page.evaluate(() => {
    const cardSelectors = [
      '.product-tile-wrapper',
      '.product-tile',
      '[data-pid]',
      'article',
      'li',
      'section',
    ].join(', ')

    const nodes = Array.from(document.querySelectorAll(cardSelectors))
    const seen = new Set()
    const results = []

    const parsePrice = (raw) => {
      if (!raw) return null
      const text = String(raw).replace(/\s+/g, ' ').replace(/\u00a0/g, ' ')
      const matches = [
        ...text.matchAll(/(?:clp|\$)\s*([0-9][0-9.\s]*)(?:,[0-9]{1,2})?/gi),
        ...text.matchAll(/\b([0-9]{1,3}(?:[.\s][0-9]{3})+(?:,[0-9]{1,2})?)\b/g),
        ...text.matchAll(/\b([0-9]{3,7})\b/g),
      ]

      for (const match of matches) {
        const num = parseInt(match[1].replace(/[^\d]/g, ''), 10)
        if (Number.isFinite(num) && num >= 100 && num <= 500000) {
          return num
        }
      }

      return null
    }

    for (const node of nodes) {
      const card = node.matches('.product-tile-wrapper, .product-tile, [data-pid]')
        ? node
        : node.closest('.product-tile-wrapper, .product-tile, [data-pid], article, li, section')

      if (!card) continue

      const rawText = (card.innerText || card.textContent || '').trim()
      if (rawText.length < 20 || rawText.length > 5000) continue

      const titleNode = card.querySelector(
        '.pdp-link a, h1, h2, h3, h4, [class*="title"], [class*="Title"], [itemprop="name"]',
      )
      const title = (titleNode?.textContent || '').trim() || rawText.slice(0, 180)

      const hrefNode = card.querySelector('.pdp-link a[href], a[href]')
      const href = hrefNode?.href || card.href || null
      const priceNode = card.querySelector(
        '.promotion-badge-container, .sales, .default-price, .price-internet, .strike-through [content], [itemprop="price"], [data-price], [class*="price"]',
      )
      const price = parsePrice(
        priceNode?.getAttribute?.('content')
        || priceNode?.textContent
        || card.innerText
        || rawText,
      )

      if (!price) continue

      const signature = `${title}|${price}|${href || ''}`
      if (seen.has(signature)) continue
      seen.add(signature)

      results.push({
        title,
        text: rawText.slice(0, 1000),
        price,
        href,
        priceCount: (rawText.match(/\b\d{3,7}\b/g) || []).length,
      })
    }

    return results
  })
}

async function scrapePharmacy(page, medicamento, pharmacy) {
  const searchQueries = buildSearchQueries(medicamento)

  for (const query of searchQueries) {
    try {
      await page.goto(pharmacy.url(encodeURIComponent(query)), {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      })

      try {
        await page.waitForSelector('[class*="product"], [class*="price"], [itemprop="price"]', {
          timeout: 10000,
        })
      } catch {
        // Algunas tiendas cargan el catálogo sin un selector estable; seguimos con el DOM actual.
      }

      const candidates = await collectCandidates(page)
      if (!candidates.length) continue

      const ranked = candidates
        .map(candidate => ({
          ...candidate,
          ...scoreCandidate(candidate, medicamento, searchQueries),
        }))
        .filter(candidate => candidate.score >= 20)

      const exactDoseCandidates = ranked.filter(candidate => candidate.exactDoseMatch)
      const pool = exactDoseCandidates.length > 0 ? exactDoseCandidates : ranked

      pool.sort((a, b) => a.price - b.price || b.score - a.score)

      if (pool.length === 0) continue

      const best = pool[0]
      return {
        farmacia: pharmacy.name,
        precio: best.price,
        url: best.href || pharmacy.url(encodeURIComponent(query)),
        score: best.score,
        query,
      }
    } catch {
      // Probamos el siguiente término de búsqueda o la siguiente farmacia.
    }
  }

  return null
}

async function getPrecioMasBarato(browser, medicamento) {
  const page = await browser.newPage()

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.setViewport({ width: 1280, height: 800 })

  await page.setRequestInterception(true)
  page.on('request', req => {
    if (['image', 'font', 'media'].includes(req.resourceType())) {
      req.abort()
      return
    }

    req.continue()
  })

  const resultados = []

  for (const pharmacy of PHARMACIES) {
    const resultado = await scrapePharmacy(page, medicamento, pharmacy)
    if (resultado) {
      resultados.push(resultado)
    }
  }

  await page.close()

  if (resultados.length === 0) return null

  return resultados.reduce((min, current) => (current.precio < min.precio ? current : min))
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const nombreIndex = args.findIndex((arg, index) => arg === '--nombre' && index < args.length - 1)
  const nombre = nombreIndex >= 0 ? args[nombreIndex + 1] : null
  const soloSinPrecio = args.includes('--solo-sin-precio')

  return { nombre, soloSinPrecio }
}

async function run() {
  const { nombre, soloSinPrecio } = parseArgs(process.argv)

  const where = {}
  if (nombre) {
    where.nombre = { contains: nombre, mode: 'insensitive' }
  }
  if (soloSinPrecio) {
    where.precioReferencia = null
  }

  const medicamentos = await prisma.medicamento.findMany({
    where,
    select: {
      id: true,
      nombre: true,
      principioActivo: true,
      presentacion: true,
    },
    orderBy: { nombre: 'asc' },
  })

  const scopeLabel = [
    soloSinPrecio ? 'sin precio' : null,
    nombre ? `nombre contiene "${nombre}"` : null,
  ].filter(Boolean).join(' y ') || 'todos'

  console.log(`🔍 Actualizando precios para ${medicamentos.length} medicamento(s) (${scopeLabel})...\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  let ok = 0
  let sinPrecio = 0

  for (const med of medicamentos) {
    const searchHint = buildSearchQueries(med)[0] || med.principioActivo
    process.stdout.write(`⏳ ${med.nombre} (${searchHint})... `)

    const resultado = await getPrecioMasBarato(browser, med)

    if (resultado) {
      await prisma.medicamento.update({
        where: { id: med.id },
        data: { precioReferencia: resultado.precio },
      })
      console.log(`✅ $${resultado.precio.toLocaleString('es-CL')} (${resultado.farmacia})`)
      ok++
    } else {
      console.log('⚠️  Sin precio encontrado')
      sinPrecio++
    }

    await sleep(1500)
  }

  await browser.close()
  await prisma.$disconnect()

  console.log(`\n✔ Terminado: ${ok} actualizados, ${sinPrecio} sin precio`)
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
