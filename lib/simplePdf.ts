type SimplePdfLine = string

export interface SimplePdfDocument {
  title: string
  subtitle?: string
  lines: SimplePdfLine[]
}

function sanitizeText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
}

function escapePdfText(value: string) {
  return sanitizeText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(value: string, maxLength = 92) {
  const text = sanitizeText(value).trim()
  if (!text) return ['']

  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    if (`${current} ${word}`.length <= maxLength) {
      current += ` ${word}`
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function chunkLines(lines: string[], chunkSize: number) {
  const chunks: string[][] = []
  for (let i = 0; i < lines.length; i += chunkSize) {
    chunks.push(lines.slice(i, i + chunkSize))
  }
  return chunks.length > 0 ? chunks : [[]]
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value)
}

export function buildSimplePdfBytes(document: SimplePdfDocument) {
  const headerLines = [
    document.title,
    document.subtitle ? document.subtitle : '',
    '',
  ].filter(Boolean)

  const bodyLines = document.lines.flatMap(line => wrapText(line))
  const allLines = [...headerLines, ...bodyLines]

  const linesPerPage = 48
  const pages = chunkLines(allLines, linesPerPage)
  const pageCount = pages.length

  const fontObjNum = 1
  const contentStartObjNum = 2
  const pageTreeObjNum = 2 + (pageCount * 2)
  const catalogObjNum = pageTreeObjNum + 1

  const objects: string[] = []

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  for (const [index, pageLines] of pages.entries()) {
    const pageNumber = index + 1
    const yStart = 800
    const contentLines = [
      'BT',
      '/F1 12 Tf',
      '14 TL',
      `50 ${yStart} Td`,
      ...pageLines.map((line, lineIndex) => {
        const escaped = escapePdfText(line)
        if (lineIndex === 0) return `(${escaped}) Tj`
        return `T* (${escaped}) Tj`
      }),
      'ET',
    ]

    const content = contentLines.join('\n')
    const contentObjNum = contentStartObjNum + ((pageNumber - 1) * 2)

    objects.push(`<< /Length ${encodeUtf8(content).length} >>\nstream\n${content}\nendstream`)
    objects.push(
      `<< /Type /Page /Parent ${pageTreeObjNum} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    )
  }

  const pageRefs = pages
    .map((_, index) => `${contentStartObjNum + (index * 2) + 1} 0 R`)
    .join(' ')

  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>`)
  objects.push(`<< /Type /Catalog /Pages ${pageTreeObjNum} 0 R >>`)

  const parts: string[] = ['%PDF-1.4\n']
  const offsets: number[] = [0]
  let length = encodeUtf8(parts[0]).length

  for (let i = 0; i < objects.length; i++) {
    offsets.push(length)
    const obj = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    parts.push(obj)
    length += encodeUtf8(obj).length
  }

  const xrefOffset = length
  const xrefLines = [
    `xref`,
    `0 ${objects.length + 1}`,
    `0000000000 65535 f `,
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `),
  ]

  const trailer = [
    `trailer`,
    `<< /Size ${objects.length + 1} /Root ${catalogObjNum} 0 R >>`,
    `startxref`,
    `${xrefOffset}`,
    `%%EOF`,
  ]

  const pdf = [...parts, `${xrefLines.join('\n')}\n`, `${trailer.join('\n')}\n`].join('')
  return encodeUtf8(pdf)
}
