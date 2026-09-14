import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push-send'
import { rateLimit } from '@/lib/rate-limit'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  const rl = rateLimit(request, { limit: 5, windowMs: 60_000, identifier: 'push-test' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  let userId: string

  // قبول CRON_SECRET + user_id في الـ body (للاختبار من الـ terminal)
  // timingSafeEqual بدون الكشف عن المفتاح — ولو CRON_SECRET غير مضبوط نرجع لـ token auth
  let isCron = false
  try {
    isCron = verifyCronAuth(request)
  } catch {
    isCron = false
  }

  if (isCron) {
    const body = await request.json().catch(() => ({}))
    if (!body.user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    userId = body.user_id
  } else {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    userId = user.id
  }

  const sent = await sendPushToUser(
    userId,
    '🔔 إشعار تجريبي من فجرك',
    'النظام يعمل بشكل صحيح! ستصلك التنبيهات اليومية في أوقاتها 🌅',
    '/dashboard/alerts',
    'test'
  )

  return NextResponse.json({ ok: true, sent })
}
