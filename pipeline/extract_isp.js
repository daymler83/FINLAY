/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')

function getMedicamentos() {
  return new Promise((resolve, reject) => {
    const medicamentos = []
    const csvPath = path.join(__dirname, 'data', 'isp.csv')

    fs.createReadStream(csvPath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (row) => {
        // Normalizar claves — el CSV puede venir con o sin tildes/espacios
        const keys = Object.keys(row)
        const get = (patterns) => {
          const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)))
          return key ? row[key]?.trim() : ''
        }

        const nombre = get(['nombre comercial', 'nombre'])
        const principioActivo = get(['principio activo', 'principio', 'activo'])
        const presentacion = get(['presentaci', 'forma farmac'])
        const laboratorio = get(['laboratorio', 'titular'])

        if (nombre) {
          medicamentos.push({ nombre, principioActivo, presentacion, laboratorio })
        }
      })
      .on('end', () => {
        console.log(`📋 ${medicamentos.length} medicamentos leídos del CSV`)
        resolve(medicamentos)
      })
      .on('error', reject)
  })
}

module.exports = { getMedicamentos }
