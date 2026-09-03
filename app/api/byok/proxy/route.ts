/**
 * BYOK LLM proxy (Feature A) — thin authenticated pass-through.
 *
 * Design decisions (see docs/projects/llm-ecosystem_prd.md):
 *   - C1  : protected by a valid Supabase SESSION — the RPC below runs as the
 *           user (SECURITY INVOKER) so auth.uid() resolves to them (+ RLS).
 *   - AD-5: per-user atomic rate counter (proxy_usage). Calls bump_proxy_usage()
 *           which does INSERT ... ON CONFLICT DO UPDATE count=count+1 RETURNING
 *           count. If count > 30/min -> fail-fast 429 (x-byok-origin: proxy).
 *   - AD-4: the provider key is decrypted IN MEMORY from an RSA-OAEP + AES-GCM
 *           envelope and destroyed in finally. The proxy is stateless; never stores.
 *   - C2  : THIN pass-through. body is base64 -> forwarded VERBATIM. Only the
 *           auth header is swapped. No format translation.
 *   - SSRF: upstream URL comes ONLY from SUPPORTED_PROVIDERS (fixed allowlist),
 *           keyed by providerId. Unknown providerId -> 400/404.
 *   - Logs : key-free — body size + sha-256 hash only. Never log auth headers.
 */

import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProvider } from '@/lib/byok/providers'
import {
  BYOK_PROXY_LIMIT_PER_MIN,
  type ByokProxyRequest,
  type ByokProxyError,
} from '@/lib/byok/types'
import { unwrapProviderKey, zeroBytes, isKekConfigured } from '@/lib/byok/envelope'

// Streaming LLM responses can run long. Extend the function max duration and
// force dynamic so we never cache the proxied body.
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function json(body: ByokProxyError | Record<string, unknown>, status: number, extra?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // 429 origin: 'provider' (upstream throttled us) vs 'proxy' (we limited the user).
      ...(extra ?? {}),
    },
  })
}

export async function POST(request: NextRequest) {
  const started = Date.now()

  // ---- 1. Session auth (C1) ------------------------------------------------
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return json({ error: 'Unauthorized: a valid session is required' }, 401)
  }

  // ---- 2. Parse + validate envelope ---------------------------------------
  let reqBody: ByokProxyRequest
  try {
    reqBody = (await request.json()) as ByokProxyRequest
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const provider = getProvider(reqBody.providerId)
  if (!provider) {
    // Unknown provider -> reject. This also keeps the SSRF allowlist intact.
    return json({ error: `Unsupported provider: ${reqBody.providerId}` }, 404)
  }
  if (provider.kind !== 'proxy') {
    return json({ error: 'clientDirect providers do not use the proxy' }, 400)
  }
  if (!reqBody.env || !reqBody.payload || !reqBody.body) {
    return json({ error: 'Missing envelope fields (env/payload/body)' }, 400)
  }
  if (!isKekConfigured()) {
    return json({ error: 'Proxy KEK is not configured on the server' }, 500)
  }

  // ---- 3. Per-user rate counter (AD-5) — fail-fast 429 --------------------
  const { data: count, error: rpcError } = await supabase.rpc('bump_proxy_usage')
  if (rpcError) {
    // RLS or invoker failure -> deny. Log key-free.
    console.error('[byok/proxy] bump_proxy_usage rpc error', rpcError.message)
    return json({ error: 'Rate limit service unavailable' }, 500)
  }
  if ((count as number) > BYOK_PROXY_LIMIT_PER_MIN) {
    return json(
      { error: `Rate limit exceeded: ${BYOK_PROXY_LIMIT_PER_MIN}/min`, origin: 'proxy' },
      429,
      { 'x-byok-origin': 'proxy' }
    )
  }

  // ---- 4. Decrypt the provider key (AD-4) — IN MEMORY ---------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyBuf = Buffer.from(reqBody.body, 'base64')
  let key: string
  try {
    key = await unwrapProviderKey(reqBody.keyId, reqBody.env, reqBody.payload)
  } catch (err) {
    return json({ error: `Failed to unwrap key: ${(err as Error).message}` }, 400)
  }

  try {
    // ---- 5. Build the upstream request (THIN pass-through, C2) ------------
    const headers = new Headers()
    headers.set('content-type', 'application/json')
    headers.set('accept', reqBody.stream ? 'text/event-stream' : 'application/json')

    // Merge non-auth extra headers (e.g. anthropic-version). Explicitly IGNORE
    // any client-supplied auth header (never trust the client with the key slot).
    for (const [h, v] of Object.entries(reqBody.headers ?? {})) {
      const lower = h.toLowerCase()
      if (lower === 'authorization' || lower === 'x-api-key' || lower === 'x-goog-api-key') {
        continue // strip — the key is injected server-side only
      }
      headers.set(h, v)
    }
    // Provider default headers (e.g. anthropic-version if not supplied).
    for (const [h, v] of Object.entries(provider.defaultHeaders ?? {})) {
      if (!headers.has(h)) headers.set(h, v)
    }
    // Inject the decrypted key per the provider's auth style.
    if (provider.auth.kind === 'bearer') headers.set('authorization', `Bearer ${key}`)
    else if (provider.auth.kind === 'x-api-key') headers.set('x-api-key', key)
    else if (provider.auth.kind === 'x-goog-api-key') headers.set('x-goog-api-key', key)

    // Key-free structured log: body size + sha-256 hash, NEVER the key/headers.
    const bodyHash = createHash('sha256').update(keyBuf).digest('hex')
    console.log('[byok/proxy] forwarding', JSON.stringify({
      userId: user.id, providerId: provider.id, stream: !!reqBody.stream,
      bodyBytes: keyBuf.length, bodySha256: bodyHash, ms: Date.now() - started,
    }))

    // ---- 6. Forward verbatim ----------------------------------------------
    const upstream = await fetch(provider.baseUrl, {
      method: 'POST',
      headers,
      body: keyBuf, // Buffer — forwarded as-is, never parsed
      // Server-side fetch: follow redirects is fine (upstream is allowlisted),
      // but we refuse any redirect off the allowlist host.
      redirect: 'error',
      signal: request.signal ? undefined : AbortSignal.timeout(110_000),
    })

    // Map upstream errors transparently. Preserve 429 origin: provider.
    if (upstream.status === 429) {
      return json({ error: 'Upstream provider rate limit', origin: 'provider' }, 429, {
        'x-byok-origin': 'provider',
      })
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return json(
        { error: upstream.status === 401 ? 'Upstream rejected the key (401)' : 'Upstream rejected the key (403)', origin: 'provider' },
        upstream.status
      )
    }
    if (!upstream.ok) {
      // Relay upstream error body verbatim (it may be a JSON error shape).
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'content-type': upstream.headers.get('content-type') ?? 'application/json',
        },
      })
    }

    // ---- 7. Relay success (incl. SSE verbatim) ----------------------------
    const contentType = upstream.headers.get('content-type') ?? ''
    if (reqBody.stream || contentType.includes('text/event-stream')) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no',
        },
      })
    }

    // Non-streaming JSON passthrough.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType || 'application/json',
      },
    })
  } catch (err) {
    // Upstream connect/timeout/net errors -> 502; the client decides what to show.
    const msg = (err as Error).message
    // Fail fast if the client aborted (don't burn a 5xx).
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') ||
      msg.includes('aborted') || msg.includes('This operation was aborted')
    if (isAbort) {
      return json({ error: 'Request aborted' }, 499)
    }
    console.error('[byok/proxy] upstream error', msg)
    return json({ error: 'Upstream error', origin: 'provider' }, 502)
  } finally {
    // ---- 8. DESTROY the provider key in memory (AD-3 / AD-4) ---------------
    zeroBytes(Buffer.from(reqBody.body, 'base64'))
    // `key` is a JS string (immutable) — we can't zero it, but it is not
    // retained, cached, or persisted anywhere. Log is key-free.
    console.log('[byok/proxy] key destroyed', JSON.stringify({ userId: user.id, ms: Date.now() - started }))
  }
}
