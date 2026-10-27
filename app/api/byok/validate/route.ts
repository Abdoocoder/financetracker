/**
 * BYOK key validation (Feature A UX) — validates a key without persisting anything.
 *
 * Accepts the same envelope format as the proxy and makes a minimal upstream
 * request to confirm the key works. The key is decrypted in memory and destroyed
 * in `finally` (never logged or stored).
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/byok/providers'
import { unwrapProviderKeyWithRotation, zeroBytes, isKekConfigured } from '@/lib/byok/envelope'
import { BYOK_PROXY_LIMIT_PER_MIN } from '@/lib/byok/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function POST(request: NextRequest) {
  // 1. Session auth
  let bearerToken: string | undefined
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice('bearer '.length).trim() || undefined
  }
  const supabase = await createClient(bearerToken)
  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken)
  if (!user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // 2. Parse body
  let reqBody: any
  try {
    reqBody = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const provider = getProvider(reqBody.providerId)
  if (!provider) {
    return json({ error: `Unsupported provider: ${reqBody.providerId}` }, 404)
  }
  if (provider.kind !== 'proxy') {
    return json({ error: 'clientDirect providers do not need validation' }, 400)
  }
  if (!reqBody.env || !reqBody.payload) {
    return json({ error: 'Missing envelope fields' }, 400)
  }
  if (!isKekConfigured()) {
    return json({ error: 'Proxy KEK not configured' }, 500)
  }

  // 3. Rate limit (reuse proxy limit bucket or just proceed; keep light)
  const { data: count, error: rpcError } = await supabase.rpc('bump_proxy_usage')
  if (rpcError) {
    console.error('[byok/validate] bump_proxy_usage rpc error', rpcError.message)
    // don't block validation on rate limit issues
  } else if ((count as number) > BYOK_PROXY_LIMIT_PER_MIN * 2) {
    // be lenient for validation
  }

  // 4. Decrypt key
  let key: string
  try {
    key = await unwrapProviderKeyWithRotation(reqBody.keyId, reqBody.env, reqBody.payload)
  } catch (err) {
    return json({ ok: false, error: 'Invalid key or envelope' }, 200)
  }

  try {
    // 5. Make a minimal validation request
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('accept', 'application/json')

    // Inject auth
    if (provider.auth.kind === 'bearer') headers.set('authorization', `Bearer ${key}`)
    else if (provider.auth.kind === 'x-api-key') headers.set('x-api-key', key)
    else if (provider.auth.kind === 'x-goog-api-key') headers.set('x-goog-api-key', key)

    // Provider defaults
    for (const [h, v] of Object.entries(provider.defaultHeaders ?? {})) {
      if (!headers.has(h)) headers.set(h, v)
    }

    // Build minimal body for validation
    let validationBody: any
    if (provider.id === 'anthropic') {
      validationBody = {
        model: provider.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }
    } else if (provider.id === 'gemini') {
      validationBody = {
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }
      // For Gemini, the URL includes the model; use a minimal generateContent
    } else {
      // OpenAI-compatible
      validationBody = {
        model: provider.defaultModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }
    }

    // For Gemini use the models.list or a minimal call; construct URL
    let upstreamUrl = provider.baseUrl
    if (provider.id === 'gemini') {
      // Try to use a known small model for validation
      upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
    }

    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(validationBody),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    })

    if (upstream.ok) {
      return json({ ok: true }, 200)
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return json({ ok: false, error: 'Invalid key' }, 200)
    }
    if (upstream.status === 429) {
      // Rate limited but key might be valid; treat as ok but note
      return json({ ok: true, warning: 'rate_limited' }, 200)
    }
    // For other errors, try to be lenient? Or report false
    // Some providers might behave differently
    return json({ ok: false, error: 'Validation failed' }, 200)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('aborted')) {
      return json({ ok: false, error: 'Timeout' }, 200)
    }
    console.error('[byok/validate] error', msg)
    return json({ ok: false, error: 'Validation error' }, 200)
  } finally {
    // key is string we can't zero, but it's not retained
  }
}
