import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendFeedbackNotification } from '@/lib/email'

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

  const userEmail = session?.email ?? (typeof body?.email === 'string' ? body.email.trim() : null)
  await prisma.feedback.create({
    data: {
      userId: session?.userId ?? null,
      email: userEmail,
      type: feedbackType,
      rating,
      title: title || null,
      message,
      source: 'web',
    },
  })

  try {
    await sendFeedbackNotification({
      to: 'finlay.dorexa@gmail.com',
      type: feedbackType,
      rating,
      title: title || null,
      message,
      userEmail,
      userId: session?.userId ?? null,
    })
  } catch (error) {
    console.error('Feedback notification email error:', error)
  }

  return NextResponse.json({ ok: true })
}
