/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function getColumnIndex(headers) {
  const normalizedHeaders = headers.map(normalize)

  const candidates = {
    nombre: ['nombre', 'nombre producto', 'producto'],
    registroIsp: ['registroisp', 'registro isp', 'numero de registro', 'nro registro', 'registro'],
    estadoRegistroIsp: ['estadoregistroisp', 'estado registro isp', 'estado', 'estado registro'],
    titularRegistroIsp: ['titularregistroisp', 'titular registro isp', 'empresa titular', 'titular'],
  }

  const indexes = {}
  for (const [key, aliases] of Object.entries(candidates)) {
    indexes[key] = normalizedHeaders.findIndex(header => aliases.includes(header))
  }

  if (indexes.nombre < 0 || indexes.registroIsp < 0) {
    throw new Error('El CSV debe incluir al menos las columnas "nombre" y "registroIsp" (o alias similares).')
  }

  return indexes
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Uso: node scripts/import-isp-registry.js <ruta_csv>')
    process.exit(1)
  }

  const absolutePath = path.resolve(csvPath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`No existe el archivo: ${absolutePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(absolutePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) {
    console.error('El CSV no tiene datos suficientes.')
    process.exit(1)
  }

  const headers = parseCsvLine(lines[0])
  const idx = getColumnIndex(headers)

  let updated = 0
  let notFound = 0
  const missingNames = []

  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line)
    const nombre = (row[idx.nombre] ?? '').trim()
    const registroIsp = (row[idx.registroIsp] ?? '').trim()
    const estadoRegistroIsp = idx.estadoRegistroIsp >= 0 ? (row[idx.estadoRegistroIsp] ?? '').trim() : ''
    const titularRegistroIsp = idx.titularRegistroIsp >= 0 ? (row[idx.titularRegistroIsp] ?? '').trim() : ''

    if (!nombre || !registroIsp) continue

    const medicamento = await prisma.medicamento.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    })

    if (!medicamento) {
      notFound++
      if (missingNames.length < 50) missingNames.push(nombre)
      continue
    }

    await prisma.medicamento.update({
      where: { id: medicamento.id },
      data: {
        registroIsp,
        estadoRegistroIsp: estadoRegistroIsp || null,
        titularRegistroIsp: titularRegistroIsp || null,
      },
    })

    updated++
  }

  console.log(`Actualizados: ${updated}`)
  console.log(`No encontrados: ${notFound}`)

  if (missingNames.length > 0) {
    console.log('Primeros no encontrados:')
    for (const name of missingNames) {
      console.log(`- ${name}`)
    }
  }
}

main()
  .catch(err => {
    console.error('Error al importar registro ISP:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
