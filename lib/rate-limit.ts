/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * ⚠️  This is a single-instance / single-process limiter.
 *     For multi-region Vercel deployments, replace with
 *     @upstash/ratelimit backed by Redis for accurate distributed limiting.
 *
 * Usage:
 *   const result = rateLimit(request, { limit: 10, windowMs: 60_000 })
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

// In-memory store keyed by IP + route identifier
const store = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of store) {
      if (record.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** Maximum number of requests in the window. Default: 20 */
  limit?: number
  /** Window duration in milliseconds. Default: 60 000 (1 minute) */
  windowMs?: number
  /** Unique identifier for this rate limit context (e.g. route name) */
  identifier?: string
}

interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  /** Headers to attach to the response */
  headers: Record<string, string>
}

export function rateLimit(
  request: Request,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { limit = 20, windowMs = 60_000, identifier = '' } = options

  // Derive a client key: prefer X-Forwarded-For (Vercel), fallback to a constant
  const forwarded = (request.headers as Headers).get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const key = `${identifier}:${ip}`

  const now = Date.now()
  const existing = store.get(key)

  let record: RateLimitRecord
  if (!existing || existing.resetAt < now) {
    record = { count: 1, resetAt: now + windowMs }
    store.set(key, record)
  } else {
    existing.count++
    record = existing
  }

  const remaining = Math.max(0, limit - record.count)
  const ok = record.count <= limit

  return {
    ok,
    remaining,
    resetAt: record.resetAt,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.ceil(record.resetAt / 1000)),
      ...(ok ? {} : { 'Retry-After': String(Math.ceil((record.resetAt - now) / 1000)) }),
    },
  }
}
