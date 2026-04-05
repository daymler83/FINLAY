import { createHash, randomInt } from 'node:crypto'

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export function createPasswordResetCode() {
  const code = String(randomInt(100000, 1000000))
  const codeHash = createHash('sha256').update(code).digest('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)

  return { code, codeHash, expiresAt }
}

export function hashPasswordResetCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}
