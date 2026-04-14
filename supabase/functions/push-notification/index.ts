// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore: Deno types
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'
// @ts-ignore: Deno types
import webpush from 'https://esm.sh/web-push@3.6.7'

// @ts-ignore: Deno global
const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
// @ts-ignore: Deno global
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// @ts-ignore: Deno global
const serviceAccountStr  = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')!
// @ts-ignore: Deno global
const vapidEmail         = Deno.env.get('VAPID_EMAIL')!
// @ts-ignore: Deno global
const vapidPublicKey     = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!
// @ts-ignore: Deno global
const vapidPrivateKey    = Deno.env.get('VAPID_PRIVATE_KEY')!

const TAG_TO_ALERT_TYPE: Record<string, string> = {
  BudgetAlert:   'warning',
  DebtReminder:  'reminder',
  SavingGoal:    'achievement',
  SystemUpdate:  'reminder',
  SecurityAlert: 'warning',
  ZakatAlert:    'warning',
}

async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: getNumericDate(0),
    exp: getNumericDate(3600),
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), (c: string) => c.charCodeAt(0))

  // @ts-ignore: Deno crypto
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error(`OAuth error: ${JSON.stringify(tokenData)}`)
  return tokenData.access_token
}

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()

    if (payload.type !== 'INSERT' || payload.table !== 'notification_history') {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    }

    const { id: historyId, user_id, title, body, category, data: recordData } = payload.record
    const url = recordData?.url ?? '/dashboard'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── تحقق من تفضيلات المستخدم ──────────────────────────────
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('enabled, quiet_start, quiet_end, mask_sensitive_data')
      .eq('user_id', user_id)
      .eq('category', category)
      .maybeSingle()

    if (pref?.enabled === false) {
      console.log(`[push] user=${user_id} category=${category} disabled by preference`)
      return new Response(JSON.stringify({ skipped: 'disabled' }), { status: 200 })
    }

    // تحقق من الساعات الهادئة
    if (pref?.quiet_start && pref?.quiet_end) {
      const now = new Date()
      const hhmm = now.getUTCHours() * 60 + now.getUTCMinutes()
      const [qsh, qsm] = pref.quiet_start.split(':').map(Number)
      const [qeh, qem] = pref.quiet_end.split(':').map(Number)
      const quietStart = qsh * 60 + qsm
      const quietEnd   = qeh * 60 + qem
      const inQuiet = quietStart <= quietEnd
        ? hhmm >= quietStart && hhmm < quietEnd
        : hhmm >= quietStart || hhmm < quietEnd
      if (inQuiet) {
        console.log(`[push] user=${user_id} in quiet hours`)
        return new Response(JSON.stringify({ skipped: 'quiet_hours' }), { status: 200 })
      }
    }

    // إخفاء الأرقام إذا طلب المستخدم ذلك
    let finalBody = body
    if (pref?.mask_sensitive_data) {
      finalBody = body.replace(/\d+(\.\d+)?/g, '***')
    }

    // ── جلب كل الاشتراكات ──────────────────────────────────────
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (!subscriptions?.length) {
      console.log(`[push] No subscriptions for user=${user_id}`)
      return new Response(JSON.stringify({ message: 'No subscriptions' }), { status: 200 })
    }

    const { count: unread } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('is_read', false)

    const badgeCount = (unread ?? 0) + 1
    const webPayload = JSON.stringify({ title, message: finalBody, url, tag: category, badgeCount })

    let fcmSent = 0
    let webSent = 0
    const invalidTokens: string[] = []

    // ── FCM (Android) ──────────────────────────────────────────
    const fcmSubs = subscriptions.filter((s: any) => s.endpoint?.startsWith('fcm:'))
    if (fcmSubs.length > 0 && serviceAccountStr) {
      try {
        const serviceAccount = JSON.parse(serviceAccountStr)
        const accessToken = await getFcmAccessToken(serviceAccount)
        const projectId = serviceAccount.project_id

        for (const sub of fcmSubs) {
          const token = sub.endpoint.replace('fcm:', '')
          const message = {
            message: {
              token,
              notification: { title, body: finalBody },
              data: { category: category ?? 'default', url },
              android: {
                notification: { sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
              },
            },
          }

          const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(message),
            }
          )

          if (res.ok) {
            fcmSent++
          } else {
            const err = await res.json()
            const errCode = err?.error?.details?.[0]?.errorCode ?? err?.error?.status
            if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT') {
              invalidTokens.push(sub.endpoint)
            }
            console.error('[push] FCM error:', JSON.stringify(err))
          }
        }
      } catch (err: any) {
        console.error('[push] FCM path error:', err.message)
      }
    }

    // ── Web Push (Chrome / Safari / Edge) ──────────────────────
    const webSubs = subscriptions.filter((s: any) => !s.endpoint?.startsWith('fcm:'))
    if (webSubs.length > 0 && vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

      for (const sub of webSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            webPayload
          )
          webSent++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            invalidTokens.push(sub.endpoint)
          } else {
            console.error('[push] Web Push error:', err.statusCode, err.message)
          }
        }
      }
    }

    // حذف الاشتراكات المنتهية الصلاحية
    if (invalidTokens.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidTokens)
    }

    // ── كتابة في alerts للعرض داخل التطبيق ───────────────────
    if (fcmSent + webSent > 0) {
      await supabase.from('alerts').insert({
        user_id,
        title,
        message: finalBody,
        type: TAG_TO_ALERT_TYPE[category] ?? 'reminder',
        frequency: 'once',
        is_read: false,
        is_active: true,
      })
    }

    console.log(`[push] user=${user_id} fcm=${fcmSent} web=${webSent}`)

    return new Response(
      JSON.stringify({ success: true, fcm: fcmSent, web: webSent }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[push] Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
