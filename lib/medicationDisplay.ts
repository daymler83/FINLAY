export function formatMedicationDisplayName(name: string) {
  const value = (name ?? '').trim()
  if (!value) return value

  const lettersOnly = value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '')
  if (!lettersOnly) return value

  const isAllCaps = lettersOnly === lettersOnly.toUpperCase()
  if (!isAllCaps) return value

  return value
    .toLowerCase()
    .replace(/\b([a-záéíóúüñ])/g, char => char.toUpperCase())
}
