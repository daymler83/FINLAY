/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { classifyVademecumRecord } = require('./vademecum_classifier')

const INPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')
const OUTPUT_FILE = path.join('/tmp', 'vademecum-chile-reclassify.sql')

function buildUpdateBlock(rows) {
  const json = JSON.stringify(rows).replace(/\$vademecum_json\$/g, '$vademecum_json_escape$')

  return `
DO $vademecum_update$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements($vademecum_json$${json}$vademecum_json$::jsonb) LOOP
    IF COALESCE(item->>'familia', 'Otro') <> 'Otro' THEN
      UPDATE "Medicamento"
      SET
        "familia" = item->>'familia',
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "nombre" = item->>'nombre'
        AND "laboratorio" = 'Vademecum Chile'
        AND "familia" = 'Otro';
    END IF;
  END LOOP;
END
$vademecum_update$;
`
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`No se encontró el dump: ${INPUT_FILE}`)
  }

  const payload = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
  const records = Array.isArray(payload.records) ? payload.records : []
  const rows = records
    .map((record, index) => classifyVademecumRecord(record, index))
    .filter(Boolean)

  let sql = `BEGIN;\n`
  sql += buildUpdateBlock(rows)
  sql += `COMMIT;\n`

  fs.writeFileSync(OUTPUT_FILE, sql)
  console.log(`📄 SQL generado: ${OUTPUT_FILE}`)
  console.log(`📦 Registros preparados: ${rows.length}`)
}

main()
