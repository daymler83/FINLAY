export function formatMedicationDisplayName(name: string) {
  const value = (name ?? '').trim()
  if (!value) return value

  return value
    .split(/\s+/)
    .map(token => {
      const lettersOnly = token.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '')
      if (!lettersOnly) return token

      // Preserve short acronyms (e.g. XR, SR, IV) for readability.
      if (lettersOnly.length <= 3 && lettersOnly === lettersOnly.toUpperCase()) {
        return token.toUpperCase()
      }

      const lower = token.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
