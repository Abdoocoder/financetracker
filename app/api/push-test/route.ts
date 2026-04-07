import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createAdminClient()

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 5, windowMs: 60_000, identifier: 'push-test' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const sent = await sendPushToUser(
    user.id,
    '🔔 إشعار تجريبي من فجرك',
    'النظام يعمل بشكل صحيح! ستصلك التنبيهات اليومية في أوقاتها 🌅',
    '/dashboard/alerts',
    'test'
  )

  return NextResponse.json({ ok: true, sent })
}
