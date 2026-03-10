import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId, title, message } = await request.json()
  const sent = await sendPushToUser(userId, title, message)
  return NextResponse.json({ ok: true, sent })
}
