import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

/**
 * Verifies that the request bears the valid CRON_SECRET bearer token.
 *
 * Security rules:
 * - If CRON_SECRET env var is not set → throws, so the misconfiguration is
 *   obvious in logs and the endpoint returns 500 (fail-closed).
 * - Uses timingSafeEqual to prevent timing attacks.
 * - Normalises token/secret to equal-length buffers before comparison
 *   (avoids RangeError on mismatched lengths, always returns false).
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Fail-loud: this is a misconfiguration — do NOT silently deny access.
    throw new Error(
      'CRON_SECRET is not set. Configure it in your environment variables.'
    )
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)

  try {
    const a = Buffer.from(token)
    const b = Buffer.from(secret)
    // timingSafeEqual requires equal-length buffers; if lengths differ → reject.
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
