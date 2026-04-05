import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type FeedbackType = 'bug' | 'idea' | 'content' | 'ux' | 'general'

export async function POST(request: NextRequest) {
  const session = await getSession()
  const body = await request.json().catch(() => null)

  const type = typeof body?.type === 'string' ? body.type : 'general'
  const rating = Number(body?.rating)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!message) {
    return NextResponse.json({ error: 'El mensaje es obligatorio' }, { status: 400 })
  }

  if (![5, 4, 3, 2, 1].includes(rating)) {
    return NextResponse.json({ error: 'La valoración debe estar entre 1 y 5' }, { status: 400 })
  }

  const feedbackType: FeedbackType = ['bug', 'idea', 'content', 'ux', 'general'].includes(type)
    ? type as FeedbackType
    : 'general'

  await prisma.feedback.create({
    data: {
      userId: session?.userId ?? null,
      email: session?.email ?? (typeof body?.email === 'string' ? body.email.trim() : null),
      type: feedbackType,
      rating,
      title: title || null,
      message,
      source: 'web',
    },
  })

  return NextResponse.json({ ok: true })
}
