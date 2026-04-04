/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config()
const { getMedicamentos } = require('./extract_isp')
const { fetchFuente }     = require('./scrape')
const { extractWithAI }   = require('./ai_extract')
const { saveMedicamento } = require('./save')
const { sleep }           = require('./utils')

async function run() {
  const meds = await getMedicamentos()

  if (meds.length === 0) {
    console.error('❌ El CSV está vacío. Agrega medicamentos en pipeline/data/isp.csv')
    process.exit(1)
  }

  let ok = 0, errors = 0

  for (const med of meds) {
    try {
      process.stdout.write(`⏳ ${med.nombre} ... `)

      const fuente  = await fetchFuente(med.nombre, med.principioActivo)
      const aiData  = await extractWithAI(fuente.texto, med.nombre, med.principioActivo)
      await saveMedicamento(med, aiData)

      console.log(`✅ [${aiData.familia || '—'}]`)
      ok++

      await sleep(1200) // pausa entre requests para no saturar APIs
    } catch (e) {
      console.log(`❌ ERROR: ${e.message}`)
      errors++
    }
  }

  console.log(`\n✔ Pipeline terminado: ${ok} guardados, ${errors} errores`)
  process.exit(0)
}

run()
