/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require('crypto')

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/g, (_, first, rest) => first.toUpperCase() + rest)
}

function cleanText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  if (text.length > 120) return fallback
  if (/^(?:s\s+)?indicaciones|^para acceder a la base de datos|^vademecum|^image:/i.test(text)) return fallback
  return text
}

function cleanArray(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(item => cleanText(item))
        .filter(Boolean)
    )
  )
}

function buildSearchText(record) {
  const sections = record && typeof record.sections === 'object' && record.sections
    ? Object.values(record.sections)
    : []

  const textParts = [
    record.nombre,
    record.nombreLocal,
    record.principioActivo,
    record.familia,
    record.categoriaClinica,
    record.via,
    record.forma,
    record.registroSanitario,
    record.laboratorio,
    record.indicaciones,
    record.contraindicaciones,
    record.interacciones,
    record.reaccionesAdversas,
    record.advertenciasPrecauciones,
    record.embarazo,
    record.lactancia,
    record.posologia,
    record.modoAdministracion,
    record.mecanismoAccion,
    sections,
  ]

  return normalize(textParts.flat().join(' '))
}

const FAMILY_RULES = [
  { category: 'antihipertensivo', family: 'IECA', terms: ['enalapril', 'captopril', 'lisinopril', 'ramipril', 'perindopril', 'quinapril', 'trandolapril', 'benazepril', 'fosinopril'] },
  { category: 'antihipertensivo', family: 'ARA-II', terms: ['losartan', 'valsartan', 'olmesartan', 'telmisartan', 'candesartan', 'irbesartan', 'eprosartan', 'azilsartan', 'sacubitril'] },
  { category: 'antihipertensivo', family: 'Betabloqueador', terms: ['atenolol', 'metoprolol', 'bisoprolol', 'carvedilol', 'propranolol', 'nebivolol', 'labetalol', 'nadolol', 'timolol', 'sotalol'] },
  { category: 'antihipertensivo', family: 'Bloqueador de canales de calcio', terms: ['amlodipino', 'nifedipino', 'verapamilo', 'diltiazem', 'felodipino', 'lercanidipino', 'nicardipino', 'barnidipino', 'nimodipino'] },
  { category: 'antihipertensivo', family: 'Diurético', terms: ['furosemida', 'hidroclorotiazida', 'clortalidona', 'indapamida', 'espironolactona', 'torasemida', 'amilorida', 'acetazolamida', 'manitol', 'bumetanida'] },
  { category: 'antidiabético', family: 'Antidiabético', terms: ['metformina', 'insulina', 'sitagliptina', 'linagliptina', 'empagliflozina', 'dapagliflozina', 'semaglutida', 'liraglutida', 'dulaglutida', 'vildagliptina', 'repaglinida', 'gliclazida', 'glimepirida', 'pioglitazona', 'acarbosa', 'tirzepatida', 'glibenclamida', 'nateglinida', 'glipizida'] },
  { category: 'aine', family: 'AINE', terms: ['ibuprofeno', 'diclofenaco', 'naproxeno', 'ketorolaco', 'meloxicam', 'celecoxib', 'dexketoprofeno', 'indometacina', 'etoricoxib', 'piroxicam', 'aceclofenaco', 'ketoprofeno', 'flurbiprofeno', 'nimesulida', 'lornoxicam', 'nabumetona'] },
  { category: 'antibiótico', family: 'Antibiótico', terms: ['amoxicilina', 'ampicilina', 'clavulanico', 'clavulanato', 'cefalexina', 'cefuroxima', 'cefixima', 'ceftriaxona', 'cefazolina', 'ceftazidima', 'cefepime', 'azitromicina', 'claritromicina', 'ciprofloxacino', 'levofloxacino', 'metronidazol', 'clindamicina', 'doxiciclina', 'tetraciclina', 'meropenem', 'vancomicina', 'linezolid', 'piperacilina', 'tazobactam', 'sulfametoxazol', 'trimetoprim', 'rifampicina', 'penicilina', 'eritromicina', 'gentamicina'] },
  { category: 'estatina', family: 'Estatina', terms: ['atorvastatina', 'rosuvastatina', 'simvastatina', 'pravastatina', 'lovastatina', 'fluvastatina', 'pitavastatina', 'ezetimiba'] },
  { family: 'IBP', terms: ['omeprazol', 'pantoprazol', 'esomeprazol', 'lansoprazol', 'rabeprazol', 'dexlansoprazol'] },
  { family: 'Analgésico/antipirético', terms: ['paracetamol', 'acetaminofen', 'acetaminofén', 'dipirona', 'metamizol', 'propacetamol'] },
  { family: 'ISRS', terms: ['sertralina', 'fluoxetina', 'escitalopram', 'paroxetina', 'citalopram', 'fluvoxamina'] },
  { family: 'IRSN', terms: ['venlafaxina', 'duloxetina', 'desvenlafaxina'] },
  { family: 'Antipsicótico', terms: ['quetiapina', 'risperidona', 'olanzapina', 'aripiprazol', 'haloperidol', 'clozapina', 'ziprasidona', 'paliperidona', 'amisulprida', 'asenapina'] },
  { family: 'Benzodiacepina', terms: ['diazepam', 'alprazolam', 'clonazepam', 'lorazepam', 'midazolam', 'bromazepam', 'clordiazepoxido', 'oxazepam', 'temazepam', 'triazolam', 'tetrazepam'] },
  { family: 'Hipnótico', terms: ['zolpidem', 'zopiclona', 'eszopiclona'] },
  { family: 'Anticoagulante', terms: ['warfarina', 'acenocumarol', 'rivaroxaban', 'apixaban', 'dabigatran', 'edoxaban', 'heparina', 'enoxaparina', 'fondaparinux'] },
  { family: 'Antiagregante', terms: ['clopidogrel', 'aspirina', 'acido acetilsalicilico', 'acetilsalicilico', 'ticagrelor', 'prasugrel', 'dipiridamol'] },
  { family: 'Antihistamínico', terms: ['loratadina', 'cetirizina', 'desloratadina', 'fexofenadina', 'levocetirizina', 'hidroxizina', 'ebastina'] },
  { family: 'Antileucotrieno', terms: ['montelukast', 'zafirlukast'] },
  { family: 'Hormona tiroidea', terms: ['levotiroxina', 'liotironina'] },
  { family: 'Broncodilatador beta-2', terms: ['salbutamol', 'formoterol', 'salmeterol', 'terbutalina', 'indacaterol', 'vilanterol', 'olodaterol', 'fenoterol', 'arformoterol'] },
  { family: 'Corticoide', terms: ['prednisona', 'prednisolona', 'dexametasona', 'betametasona', 'hidrocortisona', 'mometasona', 'budesonida', 'fluticasona', 'beclometasona', 'triamcinolona'] },
  { family: 'Antifúngico', terms: ['fluconazol', 'itraconazol', 'ketoconazol', 'clotrimazol', 'miconazol', 'terbinafina', 'voriconazol', 'posaconazol', 'anfotericina'] },
  { family: 'Antiparasitario', terms: ['albendazol', 'mebendazol', 'ivermectina', 'praziquantel', 'nitazoxanida'] },
  { family: 'Antiemético', terms: ['metoclopramida', 'ondansetron', 'ondansetrón', 'domperidona', 'granisetron', 'palonosetron', 'proclorperazina', 'trimetobenzamida'] },
  { family: 'Alfa-bloqueador', terms: ['tamsulosina', 'doxazosina', 'terazosina', 'alfuzosina', 'prazosina', 'silodosina'] },
  { family: 'Inhibidor 5-alfa reductasa', terms: ['finasterida', 'dutasterida'] },
  { family: 'Anticonvulsivante', terms: ['carbamazepina', 'lamotrigina', 'levetiracetam', 'valproato', 'valproico', 'fenitoina', 'fenitoína', 'topiramato', 'gabapentina', 'pregabalina', 'oxcarbazepina', 'clobazam', 'zonisamida'] },
  { family: 'Opioide', terms: ['morfina', 'tramadol', 'fentanilo', 'oxicodona', 'hidromorfona', 'codeina', 'buprenorfina', 'metadona', 'tapentadol'] },
  { family: 'Antiviral', terms: ['aciclovir', 'valaciclovir', 'oseltamivir', 'lamivudina', 'tenofovir', 'dolutegravir', 'bictegravir', 'ritonavir', 'lopinavir', 'nirmatrelvir', 'remdesivir'] },
  { family: 'Antiarritmico', terms: ['amiodarona', 'flecainida', 'propafenona', 'sotalol', 'quinidina'] },
  { family: 'Anticonceptivo hormonal', terms: ['etinilestradiol', 'levonorgestrel', 'drospirenona', 'desogestrel', 'gestodeno', 'noretisterona'] },
  { family: 'Antivertiginoso', terms: ['betahistina', 'betaserc', 'cinarizina', 'vertigo', 'vértigo'] },
  { family: 'Mucolítico/Expectorante', terms: ['bromhexina', 'ambroxol', 'acetilcisteina', 'acetilcisteína', 'guaifenesina', 'bisolvon', 'jarabe pectoral', 'fitotos', 'fitibronc', 'esantuss', 'bemusin', 'drosemiel'] },
  { family: 'Antácido/Antiflatulento', terms: ['antiacido', 'antiácido', 'sal de fruta', 'efervescente', 'eno ', 'frutasal', 'gasopax', 'aerogastrol', 'aerofacidose', 'carbon activado', 'simeticona'] },
  { family: 'Venotónico/Vasoprotector', terms: ['daflon', 'doxium', 'diosmina', 'hesperidina', 'castaño de indias', 'hamamelis', 'contravaris'] },
  { family: 'Broncodilatador antimuscarínico', terms: ['ipratropio', 'bromuro de ipratropio'] },
  { family: 'Antidiarreico/Probiótico', terms: ['hidrasec', 'enterol', 'racecadotrilo', 'saccharomyces boulardii'] },
  { family: 'Nootrópico/Neuroprotector', terms: ['citicolina', 'gamalate', 'ginkgo biloba', 'ginkgomax'] },
  { family: 'Fitoterápico/Homeopático', terms: ['extracto fluido', 'heel', 'homeop', 'sanakind', 'globulos', 'glóbulos', 'compositum', 'bio-ax', 'bio-cof', 'bio-dorm', 'husteel', 'engystol', 'gripp - heel', 'klimakt - heel', 'angin - heel', 'bronchalis - heel'] },
  { family: 'Antiespasmódico', terms: ['pargeverina', 'papaverina', 'otilonio', 'otilonium', 'trimebutina', 'pinaverio', 'butilhioscina', 'butilescopolamina', 'hioscina'] },
  { family: 'Antitusivo', terms: ['oxolamina', 'levodropropizina', 'dextrometorfano', 'benzonatato', 'cloperastina'] },
  { family: 'Laxante', terms: ['lactulosa', 'macrogol', 'polietilenglicol', 'bisacodilo', 'psyllium', 'senosidos', 'sorbitol', 'sodio picosulfato', 'picosulfato'] },
  { family: 'Anestésico local', terms: ['articaina', 'articaina', 'lidocaina', 'lidocaína', 'mepivacaina', 'mepivacaína', 'bupivacaina', 'bupivacaína', 'prilocaina', 'prilocaína'] },
  { family: 'Vasopresor/simpaticomimético', terms: ['epinefrina', 'adrenalina', 'efedrina', 'isoproterenol', 'norepinefrina', 'noradrenalina'] },
  { family: 'Antiséptico', terms: ['clorhexidina', 'povidona', 'yodado', 'iodado', 'antiseptico', 'antiséptico', 'octenidina', 'benzalconio', 'benzalkonium', 'agua oxigenada'] },
  { family: 'Biológico/hematológico', terms: ['epoetina', 'epoetina alfa', 'filgrastim', 'pegfilgrastim', 'molgramostim', 'interferon', 'interferón', 'darbepoetina', 'sargramostim', 'lenograstim'] },
  { family: 'Hormonal reproductivo', terms: ['gonal-f', 'menopur', 'gonapeptyl', 'progesterona', 'progest', 'estradiol', 'gonadotropina', 'follitropina', 'menotropina', 'hcg', 'hormona luteinizante', 'hormona foliculoestimulante'] },
  { family: 'Inmunológico/vacuna', terms: ['vacuna', 'vacun', 'inmunoglobulina', 'antitoxina', 'suero', 'abrysvo', 'pneumovax', 'prevenar', 'gardasil', 'havrix', 'engerix', 'rotarix', 'mencevax', 'triaxis', 'boostrix'] },
  { family: 'Antineoplásico', terms: ['azacitidina', 'decitabina', 'hidroxicarbamida', 'hydroxyurea', 'bevacizumab', 'trastuzumab', 'rituximab', 'cetuximab', 'imatinib', 'erlotinib', 'osimertinib'] },
  { family: 'Dispositivo médico', terms: ['accu-chek', 'accu chek', 'one touch', 'freestyle', 'monitor', 'medidor', 'tiras reactivas', 'tira reactiva', 'lancetas', 'lancetero', 'kit', 'sensor', 'reservorio', 'aplicador', 'bomba infusión', 'bomba infusion', 'dispositivo', 'jeringa precargada', 'cartucho'] },
  { family: 'Suplemento/Nutrición', terms: ['whey', 'krill', 'cranberry', 'brewer yeast', 'levadura de cerveza', 'formula', 'fórmula', 'progress', 'omega', 'multivitamin', 'multivitamina', 'vitamina', 'colageno', 'colágeno', 'nutricional', 'suplemento', 'suplem', 'proteina', 'proteína'] },
  { family: 'Dermocosmético', terms: ['crema', 'locion', 'loción', 'gel', 'shampoo', 'champu', 'champú', 'agua micelar', 'desmaquillante', 'balsamo', 'bálsamo', 'jabon', 'jabón', 'cuidado', 'contorno de ojos', 'hidratante', 'limpiadora', 'unguento', 'ungüento', 'pasta dental', 'labial', 'dermo', 'cosmet', 'corporal', 'facial'] },
  { family: 'Oftálmico/lubricante', terms: ['oftalmica', 'oftálmica', 'duratears', 'visine', 'lubricante ocular', 'colirio', 'gotas oftalmicas', 'gotas oftálmicas'] },
  { family: 'Urológico', terms: ['bladuril', 'solución para gotas urinarias', 'vial de instilacion'] },
  { family: 'Inhibidor de bomba de protones', terms: ['ibp', 'bomba de protones'] },
  { family: 'Antiasmático', terms: ['montelukast', 'salbutamol', 'formoterol', 'salmeterol', 'budesonida'] },
]

function resolveClassification(record) {
  const priorityText = normalize([
    record.nombre,
    record.nombreLocal,
    record.principioActivo,
    record.familia,
    record.categoriaClinica,
  ].join(' '))
  const searchText = buildSearchText(record)

  for (const rule of FAMILY_RULES) {
    if (rule.terms.some(term => priorityText.includes(term))) {
      return {
        category: rule.category || 'otros',
        family: rule.family,
        matchedTerm: rule.terms.find(term => priorityText.includes(term)) || '',
      }
    }
  }

  for (const rule of FAMILY_RULES) {
    if (rule.terms.some(term => searchText.includes(term))) {
      return {
        category: rule.category || 'otros',
        family: rule.family,
        matchedTerm: rule.terms.find(term => searchText.includes(term)) || '',
      }
    }
  }

  return { category: 'otros', family: 'Otro', matchedTerm: '' }
}

function resolvePresentacion(record) {
  const form = cleanText(record.forma, '')
  const via = cleanText(record.via, '')
  const title = cleanText(record.nombre, '')
  const pieces = [form, via].filter(Boolean)
  return pieces.length ? pieces.join(' - ') : title
}

function resolvePrincipioActivo(record, classification) {
  const explicit = cleanText(record.principioActivo, '')
  if (explicit && !/^principios activos$/i.test(explicit)) {
    return explicit
  }

  const title = cleanText(record.nombre, '')
  const searchText = buildSearchText(record)
  const candidateTerms = [
    ...FAMILY_RULES.flatMap(rule => rule.terms),
    'baclofeno',
    'pantoprazol',
    'omeprazol',
    'esomeprazol',
    'morfina',
    'tramadol',
    'paracetamol',
    'prednisona',
    'dexametasona',
    'testosterona',
    'levotiroxina',
  ]

  for (const term of candidateTerms) {
    if (searchText.includes(term)) {
      return titleCase(term)
    }
  }

  const stripped = title
    .replace(/\b(?:soluci[oó]n|comprimidos|c[aá]psulas|capsulas|jarabe|polvo|g[eé]l|crema|ung[uú]ento|suspensi[oó]n|liofilizado|aerosol|spray|tabletas|gr[aá]nulos|emulsi[oó]n|parche|óvulos|ovulos|supositorios|laca|loci[oó]n|gotas|sachet|sachets|vial|ampolla|implante|sistema|film|pasta)\b.*$/i, '')
    .replace(/\s*[-/]\s*$/, '')
    .trim()

  if (stripped) return stripped

  return classification.family === 'Otro' ? title : classification.family
}

function buildId(nombre, index) {
  const hash = crypto.createHash('sha1').update(`${index}:${nombre}`).digest('hex').slice(0, 16)
  return `vdc_${index}_${hash}`
}

function classifyVademecumRecord(record, index = 0) {
  const nombre = cleanText(record.nombre, '')
  if (!nombre) return null

  const classification = resolveClassification(record)
  return {
    id: buildId(nombre, index),
    nombre,
    principioActivo: resolvePrincipioActivo(record, classification),
    familia: classification.family,
    categoriaClinica: classification.category,
    presentacion: resolvePresentacion(record),
    laboratorio: cleanText(record.laboratorio, 'Vademecum Chile'),
    precioReferencia: Number.isFinite(Number(record.precioReferencia)) ? Number(record.precioReferencia) : null,
    vidaMedia: cleanText(record.vidaMedia, null),
    nivelInteracciones: cleanText(record.nivelInteracciones, null),
    efectosAdversos: cleanArray(record.efectosAdversos),
    contraindicaciones: cleanArray(record.contraindicaciones),
    indicaciones: cleanArray(record.indicaciones),
  }
}

module.exports = {
  classifyVademecumRecord,
  cleanArray,
  cleanText,
  normalize,
  resolveClassification,
  resolvePrincipioActivo,
  resolvePresentacion,
  titleCase,
}
