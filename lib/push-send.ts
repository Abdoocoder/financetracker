import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function sendFCM(fcmToken: string, title: string, message: string, url: string) {
  const { sendFCMNotification } = await import('./firebase-admin')
  return sendFCMNotification(fcmToken, title, message, `https://fajrak.com${url}`)
}

export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url = '/dashboard/alerts',
  tag = 'finance-alert'
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subs?.length) return 0

  const { count: unread } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  const payload = JSON.stringify({ title, message, url, tag, badgeCount: (unread ?? 0) + 1 })
  let sent = 0

  for (const sub of subs) {
    // FCM token
    if (sub.endpoint?.startsWith('fcm:')) {
      const fcmToken = sub.endpoint.replace('fcm:', '')
      const ok = await sendFCM(fcmToken, title, message, `https://fajrak.com${url}`)
      if (ok) sent++
      continue
    }

    // Web Push
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  if (sent > 0) {
    try {
      await supabase.from('alerts').insert({
        user_id: userId,
        title,
        message,
        type: ['warning','motivation','reminder','achievement'].includes(tag) ? tag : 'reminder',
        frequency: 'once',
        is_read: false,
      })
    } catch {}
  }

  return sent
}
