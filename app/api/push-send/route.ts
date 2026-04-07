import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'
import { rateLimit } from '@/lib/rate-limit'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 100, windowMs: 60_000, identifier: 'push-send' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })

  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId, title, message } = await request.json()
  const sent = await sendPushToUser(userId, title, message)
  return NextResponse.json({ ok: true, sent })
}
