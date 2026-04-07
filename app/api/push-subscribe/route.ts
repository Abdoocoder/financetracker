import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createAdminClient()

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 10, windowMs: 60_000, identifier: 'push-subscribe' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()

    // FCM token من Android
    if (body.fcmToken && body.type === 'fcm') {
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: `fcm:${body.fcmToken}`,
        p256dh: 'fcm',
        auth: 'fcm',
      }, { onConflict: 'user_id,endpoint' })
      return NextResponse.json({ ok: true, type: 'fcm' })
    }

    // Web Push من iOS وباقي الأجهزة
    const { endpoint, keys } = body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'user_id,endpoint' })

    return NextResponse.json({ ok: true, type: 'webpush' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const rl = rateLimit(request, { limit: 10, windowMs: 60_000, identifier: 'push-subscribe' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers })
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await request.json()
    await supabase.from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
