import { SignJWT, jwtVerify } from 'jose'
import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const COOKIE_NAME = 'farmachile_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

function getSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('Falta configurar JWT_SECRET en producción')
  }

  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'farmachile-dev-secret-cambiar-en-produccion'
  )
}

export interface SessionPayload {
  userId: string
  email: string
  isPro: boolean
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  rememberMe = true,
) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? SESSION_MAX_AGE : undefined,
    path: '/',
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
