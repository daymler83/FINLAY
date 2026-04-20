import { NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth'
import { invalidateCachedUser } from '@/lib/userCache'

export async function POST() {
  const session = await getSession()
  if (session?.userId) invalidateCachedUser(session.userId)
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
