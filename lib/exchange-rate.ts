/**
 * Server-side exchange-rate lookup.
 *
 * The client helper in `lib/currency.ts` is `'use client'` and fetches a
 * relative `/api/exchange-rate` URL with the browser session, so it cannot be
 * used by route handlers or tools. This module owns the upstream provider call
 * (open.er-api.com, cached for one hour) and is shared by:
 *   - `app/api/exchange-rate/route.ts` (serves the browser)
 *   - `lib/unified-tools` (multi-currency transaction writes)
 *   - `lib/agent/tools` (agent financial snapshot)
 *
 * Provider contract (verified 2026-10-23):
 *   GET https://open.er-api.com/v6/latest/{BASE}
 *   → { result: "ok", base_code: "USD", rates: { JOD: 0.709, ... },
 *       time_last_update_utc: "Thu, 23 Oct 2026 00:02:31 +0000" }
 *   A bad base code returns { result: "error", "error-type": "unsupported-code" }.
 */

const CURRENCY_RE = /^[A-Z]{3}$/

export type ExchangeRateFailure = 'invalid_currency' | 'unknown_target' | 'upstream_error'

export type ExchangeRateLookup =
  | { ok: true; base: string; target: string; rate: number; lastUpdated: string | null }
  | { ok: false; reason: ExchangeRateFailure }

/**
 * Resolves `target` per one unit of `base`.
 *
 * Never throws: network/provider failures are reported as `upstream_error` so
 * callers can decide whether to fail closed (transaction writes) or degrade
 * (display-only reads).
 */
export async function lookupExchangeRate(
  base: string,
  target: string
): Promise<ExchangeRateLookup> {
  const from = (base || '').toUpperCase()
  const to = (target || '').toUpperCase()

  if (!CURRENCY_RE.test(from) || !CURRENCY_RE.test(to)) {
    return { ok: false, reason: 'invalid_currency' }
  }

  if (from === to) {
    return { ok: true, base: from, target: to, rate: 1, lastUpdated: null }
  }

  let data: {
    result?: string
    rates?: Record<string, number>
    time_last_update_utc?: string
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, {
      next: { revalidate: 3600 },
    })
    data = await res.json()
  } catch {
    return { ok: false, reason: 'upstream_error' }
  }

  if (data?.result === 'error') {
    return { ok: false, reason: 'invalid_currency' }
  }

  const rate = data?.rates?.[to]
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    return { ok: false, reason: 'unknown_target' }
  }

  return {
    ok: true,
    base: from,
    target: to,
    rate,
    lastUpdated: data.time_last_update_utc ?? null,
  }
}

/**
 * Convenience wrapper returning just the rate, or `null` when unavailable.
 * Use this for fail-closed writes: a `null` rate must abort the write.
 */
export async function fetchExchangeRateServer(
  base: string,
  target: string
): Promise<number | null> {
  const result = await lookupExchangeRate(base, target)
  return result.ok ? result.rate : null
}
