// @ts-ignore: Deno types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore: Deno types
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

// @ts-ignore: Deno global
const supabaseUrl       = Deno.env.get('SUPABASE_URL')!
// @ts-ignore: Deno global
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// @ts-ignore: Deno global
const serviceAccountStr  = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')!

async function getFcmAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: getNumericDate(0),
    exp: getNumericDate(3600),
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // استخراج المفتاح الخاص بصيغة PKCS8
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

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

    if (!serviceAccountStr) {
      console.error('[push-notification] FIREBASE_SERVICE_ACCOUNT_KEY missing')
      return new Response(JSON.stringify({ error: 'FCM not configured' }), { status: 500 })
    }

    const { user_id, title, body, category, data: recordData } = payload.record

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', user_id)
      .like('endpoint', 'fcm:%')

    if (error || !subscriptions?.length) {
      console.log(`[push-notification] No FCM devices for user: ${user_id}`)
      return new Response(JSON.stringify({ message: 'No FCM devices' }), { status: 200 })
    }

    const tokens = subscriptions
      .map((s: { endpoint: string }) => s.endpoint.replace('fcm:', ''))
      .filter(Boolean)

    const serviceAccount = JSON.parse(serviceAccountStr)
    const accessToken = await getFcmAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id
    const url = recordData?.url ?? '/dashboard'

    let successCount = 0
    let failureCount = 0
    const invalidTokens: string[] = []

    for (const token of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body },
          data: { category: category ?? 'default', url },
          android: {
            notification: {
              sound: 'default',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
          },
        },
      }

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        }
      )

      if (res.ok) {
        successCount++
      } else {
        const err = await res.json()
        const errCode = err?.error?.details?.[0]?.errorCode ?? err?.error?.status
        if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT') {
          invalidTokens.push(`fcm:${token}`)
        }
        console.error('[push-notification] FCM error:', JSON.stringify(err))
        failureCount++
      }
    }

    // حذف الرموز المنتهية الصلاحية
    if (invalidTokens.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', invalidTokens)
    }

    console.log(`[push-notification] user=${user_id} sent=${successCount} failed=${failureCount}`)

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failureCount }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[push-notification] Unexpected error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
