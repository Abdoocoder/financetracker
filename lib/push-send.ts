import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// VAPID يُهيَّأ عند الاستخدام الأول فقط لتفادي الفشل الصامت عند غياب المتغيرات
let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  const email = process.env.VAPID_EMAIL
  const pub   = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv  = process.env.VAPID_PRIVATE_KEY
  if (!email || !pub || !priv) {
    console.error('[push-send] VAPID env vars missing:', { email: !!email, pub: !!pub, priv: !!priv })
    return
  }
  webpush.setVapidDetails(email, pub, priv)
  vapidConfigured = true
}

// خريطة من tag إلى notification_category (لجدول notification_history)
const TAG_TO_CATEGORY: Record<string, string> = {
  morning:         'SystemUpdate',
  evening:         'SystemUpdate',
  weekly:          'SystemUpdate',
  nudge:           'SystemUpdate',
  lesson:          'SystemUpdate',
  wealth:          'SystemUpdate',
  warning:         'BudgetAlert',
  budget:          'BudgetAlert',
  debt:            'DebtReminder',
  'receivable-debt': 'DebtReminder',
  goal:            'SavingGoal',
  achievement:     'SavingGoal',
  security:        'SecurityAlert',
}
function toCategory(tag: string): string {
  return TAG_TO_CATEGORY[tag] ?? 'SystemUpdate'
}

export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url = '/dashboard/alerts',
  tag = 'finance-alert',
  supabaseClient?: any
) {
  const supabase = supabaseClient || getSupabase()
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
    // ── FCM (Android) ────────────────────────────────────────────
    // بدلاً من استدعاء FCM مباشرة، نكتب في notification_history
    // والـ Supabase Webhook يُطلق Edge Function التي ترسل الإشعار
    if (sub.endpoint?.startsWith('fcm:')) {
      try {
        // fingerprint يمنع إرسال نفس الإشعار مرتين في نفس الساعة
        const fingerprint = `${userId}:${tag}:${new Date().toISOString().slice(0, 13)}`
        const { data: existing } = await supabase
          .from('notification_history')
          .select('id')
          .eq('fingerprint', fingerprint)
          .maybeSingle()
        if (existing) { sent++; continue }

        const { error } = await supabase.from('notification_history').insert({
          user_id: userId,
          category: toCategory(tag),
          title,
          body: message,
          data: { url, tag },
          fingerprint,
        })
        if (!error) sent++
        else console.error('[push-send] notification_history insert error:', error.message)
      } catch (err: any) {
        console.error('[push-send] FCM path error:', err.message)
      }
      continue
    }

    // ── Web Push (Chrome / Safari / Edge) ────────────────────────
    try {
      ensureVapid()
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('[push-send] webpush error:', err.statusCode, err.message)
      }
    }
  }

  // ── حفظ في alerts (للعرض داخل التطبيق) ──────────────────────
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
