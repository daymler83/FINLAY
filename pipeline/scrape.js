/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios')
const cheerio = require('cheerio')

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Intenta obtener texto de una URL específica
async function fetchUrl(url) {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 10000,
  })
  const $ = cheerio.load(data)
  $('script, style, nav, footer, header').remove()
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)
}

// Búsqueda en DuckDuckGo HTML (no bloquea bots)
async function searchDDG(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': UA },
    timeout: 15000,
  })
  const $ = cheerio.load(data)

  // Extraer snippets de resultados
  const snippets = []
  $('.result__snippet').each((_, el) => snippets.push($(el).text().trim()))
  $('.result__title').each((_, el) => snippets.push($(el).text().trim()))

  return snippets.join(' ').slice(0, 4000)
}

async function fetchFuente(nombre, principioActivo) {
  const textos = []

  // Fuente 1: DuckDuckGo con nombre comercial + Chile
  try {
    const t = await searchDDG(`${principioActivo} medicamento indicaciones contraindicaciones efectos adversos`)
    if (t.length > 100) textos.push(t)
  } catch { /* silencioso */ }

  // Fuente 2: Vademécum español (buena cobertura de principios activos)
  try {
    const slug = principioActivo.toLowerCase().split(' ')[0]
    const t = await fetchUrl(`https://www.vademecum.es/principios-activos-${slug}-N`)
    if (t.length > 100) textos.push(t.slice(0, 2000))
  } catch { /* silencioso */ }

  const texto = textos.join('\n\n').slice(0, 5000)

  return {
    url: `ddg:${nombre}`,
    texto: texto || `Medicamento: ${nombre}. Principio activo: ${principioActivo}.`
  }
}

module.exports = { fetchFuente }
