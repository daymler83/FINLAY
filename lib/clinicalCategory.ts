export type ClinicalCategory =
  | 'antihipertensivo'
  | 'antidiabético'
  | 'aine'
  | 'antibiótico'
  | 'estatina'
  | 'otros'

const CATEGORY_LABELS: Record<ClinicalCategory, string> = {
  antihipertensivo: 'Antihipertensivo',
  antidiabético: 'Antidiabético',
  aine: 'AINE',
  antibiótico: 'Antibiótico',
  estatina: 'Estatina',
  otros: 'Otra categoría',
}

const CATEGORY_MATCHERS: Record<Exclude<ClinicalCategory, 'otros'>, string[]> = {
  antihipertensivo: [
    'ieca',
    'ara-ii',
    'ara ii',
    'bloqueador de canales de calcio',
    'betabloqueador',
    'diurético',
    'diuretico',
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
  estatina: [
    'estatina',
  ],
}

export function resolveClinicalCategory(familia: string, principioActivo: string): ClinicalCategory {
  const source = `${familia} ${principioActivo}`.toLowerCase()

  for (const [category, matchers] of Object.entries(CATEGORY_MATCHERS) as [
    Exclude<ClinicalCategory, 'otros'>,
    string[],
  ][]) {
    if (matchers.some(term => source.includes(term))) {
      return category
    }
  }

  return 'otros'
}

export function matchesClinicalCategory(
  familia: string,
  principioActivo: string,
  category: ClinicalCategory
): boolean {
  if (category === 'otros') return false
  return resolveClinicalCategory(familia, principioActivo) === category
}

export function getClinicalCategoryLabel(category: ClinicalCategory): string {
  return CATEGORY_LABELS[category]
}
