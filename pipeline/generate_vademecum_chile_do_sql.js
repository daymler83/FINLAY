/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { classifyVademecumRecord } = require('./vademecum_classifier')

const INPUT_FILE = path.join(__dirname, 'data', 'vademecum-chile.json')
const OUTPUT_FILE = path.join('/tmp', 'vademecum-chile-import-do.sql')

function buildDoBlock(batch) {
  const json = JSON.stringify(batch).replace(/\$vademecum_json\$/g, '$vademecum_json_escape$')

  return `
DO $vademecum_do$
DECLARE
  item jsonb;
  efectos text[];
  contra text[];
  indic text[];
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements($vademecum_json$${json}$vademecum_json$::jsonb) LOOP
    BEGIN
      efectos := COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(COALESCE(item->'efectosAdversos', '[]'::jsonb)) AS t(value)),
        ARRAY[]::text[]
      );
      contra := COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(COALESCE(item->'contraindicaciones', '[]'::jsonb)) AS t(value)),
        ARRAY[]::text[]
      );
      indic := COALESCE(
        (SELECT array_agg(value) FROM jsonb_array_elements_text(COALESCE(item->'indicaciones', '[]'::jsonb)) AS t(value)),
        ARRAY[]::text[]
      );

      INSERT INTO "Medicamento" (
        "id",
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
        "indicaciones",
        "updatedAt"
      ) VALUES (
        item->>'id',
        item->>'nombre',
        item->>'principioActivo',
        item->>'familia',
        item->>'presentacion',
        item->>'laboratorio',
        NULLIF(item->>'precioReferencia', '')::double precision,
        NULLIF(item->>'vidaMedia', ''),
        NULLIF(item->>'nivelInteracciones', ''),
        efectos,
        contra,
        indic,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("nombre") DO NOTHING;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping %: %', item->>'nombre', SQLERRM;
    END;
  END LOOP;
END
$vademecum_do$;
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
  sql += buildDoBlock(rows)
  sql += `COMMIT;\n`

  fs.writeFileSync(OUTPUT_FILE, sql)
  console.log(`📄 SQL generado: ${OUTPUT_FILE}`)
  console.log(`📦 Registros preparados: ${rows.length}`)
}

main()
