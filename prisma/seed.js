/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const CSV_PATH = path.join(__dirname, '..', 'pipeline', 'data', 'isp.csv')

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const dataLines = lines.slice(1)

  return dataLines.map(line => {
    const [nombre = '', principioActivo = '', presentacion = '', laboratorio = ''] = line.split(',')
    return {
      nombre: nombre.trim(),
      principioActivo: principioActivo.trim(),
      presentacion: presentacion.trim(),
      laboratorio: laboratorio.trim(),
    }
  }).filter(row => row.nombre)
}

function familyAndClass(nombre, principioActivo) {
  const source = normalize(`${nombre} ${principioActivo}`)

  if (source.includes('enalapril') || source.includes('captopril') || source.includes('lisinopril')) {
    return { familia: 'IECA', nivelInteracciones: 'Moderadas', vidaMedia: source.includes('captopril') ? '2 h' : '11 h' }
  }

  if (source.includes('losartan') || source.includes('valsartan') || source.includes('candesartan') || source.includes('irbesartan')) {
    return { familia: 'ARA-II', nivelInteracciones: 'Moderadas', vidaMedia: '6-12 h' }
  }

  if (source.includes('amlodipino') || source.includes('nifedipino') || source.includes('verapamilo') || source.includes('diltiazem')) {
    return { familia: 'Bloqueador de canales de calcio', nivelInteracciones: 'Moderadas', vidaMedia: source.includes('amlodipino') ? '30-50 h' : '3-8 h' }
  }

  if (source.includes('metformina') || source.includes('glibenclamida') || source.includes('insulina') || source.includes('sulfonilurea')) {
    return { familia: 'Antidiabético', nivelInteracciones: 'Moderadas', vidaMedia: source.includes('metformina') ? '6-18 h' : null }
  }

  if (source.includes('atorvastatina') || source.includes('simvastatina') || source.includes('rosuvastatina') || source.includes('pravastatina')) {
    return { familia: 'Estatina', nivelInteracciones: 'Moderadas', vidaMedia: source.includes('atorvastatina') ? '14 h' : '2-3 h' }
  }

  if (source.includes('omeprazol') || source.includes('pantoprazol') || source.includes('esomeprazol') || source.includes('lansoprazol')) {
    return { familia: 'Inhibidor de bomba de protones', nivelInteracciones: 'Pocas', vidaMedia: '1-2 h' }
  }

  if (source.includes('ibuprofeno') || source.includes('diclofenaco') || source.includes('naproxeno') || source.includes('ketorolaco') || source.includes('meloxicam') || source.includes('celecoxib')) {
    return { familia: 'AINE', nivelInteracciones: 'Muchas', vidaMedia: '2-15 h' }
  }

  if (source.includes('paracetamol') || source.includes('acetaminofen')) {
    return { familia: 'Analgésico/antipirético', nivelInteracciones: 'Pocas', vidaMedia: '2-3 h' }
  }

  if (source.includes('sertralina') || source.includes('fluoxetina') || source.includes('escitalopram') || source.includes('paroxetina')) {
    return { familia: 'ISRS', nivelInteracciones: 'Muchas', vidaMedia: source.includes('fluoxetina') ? '2-7 días' : '1-3 días' }
  }

  if (source.includes('venlafaxina') || source.includes('duloxetina')) {
    return { familia: 'IRSN', nivelInteracciones: 'Muchas', vidaMedia: '5-12 h' }
  }

  if (source.includes('quetiapina') || source.includes('risperidona') || source.includes('olanzapina')) {
    return { familia: 'Antipsicótico', nivelInteracciones: 'Muchas', vidaMedia: '6-30 h' }
  }

  if (source.includes('diazepam') || source.includes('alprazolam') || source.includes('clonazepam')) {
    return { familia: 'Benzodiacepina', nivelInteracciones: 'Muchas', vidaMedia: source.includes('diazepam') ? '20-50 h' : '11-40 h' }
  }

  if (source.includes('zolpidem')) {
    return { familia: 'Hipnótico', nivelInteracciones: 'Moderadas', vidaMedia: '2-3 h' }
  }

  if (source.includes('warfarina') || source.includes('acenocumarol')) {
    return { familia: 'Anticoagulante', nivelInteracciones: 'Muchas', vidaMedia: source.includes('warfarina') ? '36-42 h' : '8-12 h' }
  }

  if (source.includes('clopidogrel') || source.includes('aspirina') || source.includes('acido acetilsalicilico')) {
    return { familia: 'Antiagregante', nivelInteracciones: 'Muchas', vidaMedia: '6 h' }
  }

  if (source.includes('atenolol') || source.includes('propranolol') || source.includes('metoprolol') || source.includes('bisoprolol') || source.includes('carvedilol')) {
    return { familia: 'Betabloqueador', nivelInteracciones: 'Moderadas', vidaMedia: '3-12 h' }
  }

  if (source.includes('furosemida') || source.includes('hidroclorotiazida') || source.includes('espironolactona')) {
    return { familia: 'Diurético', nivelInteracciones: 'Moderadas', vidaMedia: source.includes('espironolactona') ? '1.4 h' : '1-6 h' }
  }

  if (source.includes('amoxicilina') || source.includes('cefalexina') || source.includes('cefuroxima') || source.includes('clavulanato')) {
    return { familia: 'Betalactámico', nivelInteracciones: 'Pocas', vidaMedia: '1-2 h' }
  }

  if (source.includes('ciprofloxacino') || source.includes('levofloxacino')) {
    return { familia: 'Fluoroquinolona', nivelInteracciones: 'Muchas', vidaMedia: '4-8 h' }
  }

  if (source.includes('azitromicina') || source.includes('claritromicina')) {
    return { familia: 'Macrólido', nivelInteracciones: 'Muchas', vidaMedia: source.includes('azitromicina') ? '68 h' : '3-7 h' }
  }

  if (source.includes('loratadina') || source.includes('cetirizina') || source.includes('desloratadina') || source.includes('fexofenadina')) {
    return { familia: 'Antihistamínico', nivelInteracciones: 'Pocas', vidaMedia: '8-27 h' }
  }

  if (source.includes('montelukast')) {
    return { familia: 'Antileucotrieno', nivelInteracciones: 'Pocas', vidaMedia: '2.7-5.5 h' }
  }

  if (source.includes('levotiroxina')) {
    return { familia: 'Hormona tiroidea', nivelInteracciones: 'Muchas', vidaMedia: '7 días' }
  }

  if (source.includes('salbutamol')) {
    return { familia: 'Broncodilatador beta-2', nivelInteracciones: 'Moderadas', vidaMedia: '3-6 h' }
  }

  if (source.includes('prednisona')) {
    return { familia: 'Corticoide', nivelInteracciones: 'Muchas', vidaMedia: '2-4 h' }
  }

  if (source.includes('metronidazol')) {
    return { familia: 'Antibacteriano/antiprotozoario', nivelInteracciones: 'Muchas', vidaMedia: '6-8 h' }
  }

  if (source.includes('fluconazol')) {
    return { familia: 'Antifúngico', nivelInteracciones: 'Muchas', vidaMedia: '30 h' }
  }

  if (source.includes('albendazol')) {
    return { familia: 'Antiparasitario', nivelInteracciones: 'Pocas', vidaMedia: '8-12 h' }
  }

  if (source.includes('metoclopramida') || source.includes('ondansetron') || source.includes('ondansetrón') || source.includes('domperidona')) {
    return { familia: 'Antiemético', nivelInteracciones: 'Moderadas', vidaMedia: '5-8 h' }
  }

  if (source.includes('tamsulosina')) {
    return { familia: 'Alfa-bloqueador', nivelInteracciones: 'Moderadas', vidaMedia: '9-15 h' }
  }

  if (source.includes('finasterida')) {
    return { familia: 'Inhibidor 5-alfa reductasa', nivelInteracciones: 'Pocas', vidaMedia: '6-8 h' }
  }

  return { familia: 'Otro', nivelInteracciones: 'Pocas', vidaMedia: null }
}

function buildClinicalData(familia, principioActivo) {
  const source = normalize(`${familia} ${principioActivo}`)

  if (source.includes('ieca') || source.includes('ara-ii') || source.includes('bloqueador de canales de calcio') || source.includes('betabloqueador') || source.includes('diuretico') || source.includes('diurético')) {
    return {
      indicaciones: ['Hipertensión arterial', 'Control de la presión arterial'],
      efectosAdversos: ['Mareos', 'Hipotensión'],
      contraindicaciones: ['Embarazo', 'Hipersensibilidad al fármaco'],
    }
  }

  if (source.includes('antidiabetico') || source.includes('antidiabético')) {
    return {
      indicaciones: ['Diabetes mellitus tipo 2'],
      efectosAdversos: ['Hipoglucemia', 'Náuseas'],
      contraindicaciones: ['Hipoglucemia', 'Hipersensibilidad'],
    }
  }

  if (source.includes('estatina')) {
    return {
      indicaciones: ['Dislipidemia', 'Prevención cardiovascular'],
      efectosAdversos: ['Mialgias', 'Elevación de transaminasas'],
      contraindicaciones: ['Enfermedad hepática activa'],
    }
  }

  if (source.includes('ibp') || source.includes('bomba de protones')) {
    return {
      indicaciones: ['ERGE', 'Úlcera péptica'],
      efectosAdversos: ['Cefalea', 'Diarrea'],
      contraindicaciones: ['Hipersensibilidad'],
    }
  }

  if (source.includes('aine')) {
    return {
      indicaciones: ['Dolor', 'Inflamación'],
      efectosAdversos: ['Gastritis', 'Riesgo renal'],
      contraindicaciones: ['Úlcera péptica activa', 'Hipersensibilidad'],
    }
  }

  if (source.includes('antibiótico') || source.includes('betalactámico') || source.includes('fluoroquinolona') || source.includes('macrólido') || source.includes('macrolido')) {
    return {
      indicaciones: ['Infecciones bacterianas susceptibles'],
      efectosAdversos: ['Náuseas', 'Diarrea'],
      contraindicaciones: ['Alergia al fármaco'],
    }
  }

  if (source.includes('isrs') || source.includes('irsn') || source.includes('antidepresivo')) {
    return {
      indicaciones: ['Depresión', 'Trastornos de ansiedad'],
      efectosAdversos: ['Náuseas', 'Somnolencia'],
      contraindicaciones: ['Uso concomitante con IMAO'],
    }
  }

  if (source.includes('benzodiacepina') || source.includes('hipnótico')) {
    return {
      indicaciones: ['Ansiedad', 'Insomnio'],
      efectosAdversos: ['Somnolencia', 'Mareo'],
      contraindicaciones: ['Depresión respiratoria'],
    }
  }

  if (source.includes('anticoagulante') || source.includes('antiagregante')) {
    return {
      indicaciones: ['Prevención de eventos tromboembólicos'],
      efectosAdversos: ['Sangrado', 'Hematomas'],
      contraindicaciones: ['Sangrado activo'],
    }
  }

  if (source.includes('antihistamínico') || source.includes('antihistaminico')) {
    return {
      indicaciones: ['Rinitis alérgica', 'Urticaria'],
      efectosAdversos: ['Somnolencia', 'Boca seca'],
      contraindicaciones: ['Hipersensibilidad'],
    }
  }

  if (source.includes('antipsicótico') || source.includes('antipsicotico')) {
    return {
      indicaciones: ['Esquizofrenia', 'Trastorno bipolar'],
      efectosAdversos: ['Sedación', 'Aumento de peso'],
      contraindicaciones: ['Depresión del SNC severa'],
    }
  }

  return {
    indicaciones: ['Uso según indicación médica'],
    efectosAdversos: ['Náuseas', 'Mareo'],
    contraindicaciones: ['Hipersensibilidad'],
  }
}

async function main() {
  console.log('🌱 Iniciando seed del catálogo...')

  const medicamentos = parseCsv(CSV_PATH)
  console.log(`📋 ${medicamentos.length} medicamentos leídos del CSV`)

  for (const base of medicamentos) {
    const classInfo = familyAndClass(base.nombre, base.principioActivo)
    const clinicalData = buildClinicalData(classInfo.familia, base.principioActivo)

    await prisma.medicamento.upsert({
      where: { nombre: base.nombre },
      update: {
        principioActivo: base.principioActivo,
        presentacion: base.presentacion,
        laboratorio: base.laboratorio,
        familia: classInfo.familia,
        efectosAdversos: clinicalData.efectosAdversos,
        contraindicaciones: clinicalData.contraindicaciones,
        indicaciones: clinicalData.indicaciones,
        vidaMedia: classInfo.vidaMedia,
        nivelInteracciones: classInfo.nivelInteracciones,
      },
      create: {
        nombre: base.nombre,
        principioActivo: base.principioActivo,
        presentacion: base.presentacion,
        laboratorio: base.laboratorio,
        familia: classInfo.familia,
        precioReferencia: null,
        vidaMedia: classInfo.vidaMedia,
        nivelInteracciones: classInfo.nivelInteracciones,
        efectosAdversos: clinicalData.efectosAdversos,
        contraindicaciones: clinicalData.contraindicaciones,
        indicaciones: clinicalData.indicaciones,
      },
    })

    console.log(`✅ Agregado: ${base.nombre}`)
  }

  console.log('✅ Seed completo')
}

main()
  .catch((error) => {
    console.error('❌ Error en seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
