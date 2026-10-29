/**
 * BYOK key-validation verdicts — SHARED by the settings UI and its tests.
 *
 * `/api/byok/validate` answers **HTTP 200** for every *key* verdict and returns
 * a machine-readable `{ ok, code }`. So a 401/403 coming back from the route is
 * the *session* being rejected, never the provider key — and a 404/410 from
 * upstream is about the model, not the user's key.
 *
 * This mirrors mobile `_classifyValidationResponse` in
 * `mobile/fajrak_flutter/lib/widgets/settings/byok_keys_section.dart`. Keep the
 * two in sync: a divergence means one client tells the truth and the other
 * blames the user's key.
 *
 * The returned message is an i18n KEY (web `lib/locales/{en,ar}/settings.ts`) —
 * never a translated string and never the route's raw English `error` field.
 */

/** `ok` plus, when rejected, the i18n key explaining why. */
export interface ValidationVerdict {
  ok: boolean
  errorKey?: string
}

const CODE_TO_KEY: Record<string, string> = {
  // The provider rejected the key itself.
  auth: 'byok_validate_failed_auth',
  // The key is fine but the tested model slug is gone/inaccessible.
  'model-not-found': 'byok_validate_failed_model',
  'model-unavailable': 'byok_validate_failed_model',
  // The provider is down — say nothing about the key.
  'provider-down': 'byok_validate_failed_unavailable',
}

/**
 * Map a `/api/byok/validate` response to a verdict.
 *
 * Inconclusive responses (non-JSON body from a CDN/proxy, 429 "rate limited",
 * unknown codes) deliberately *pass*: we only block a save on a definitive
 * rejection, because a key we could not test is still worth having.
 */
export function classifyValidationResponse(
  status: number,
  bodyText: string
): ValidationVerdict {
  // Session, not key. The route uses 200 for key verdicts, so this is our auth.
  if (status === 401 || status === 403) {
    return { ok: false, errorKey: 'byok_keys_save_failed_auth' }
  }
  if (status >= 500) {
    return { ok: false, errorKey: 'byok_validate_failed_unavailable' }
  }
  // Edge/CDN rate limiting (the route itself always answers 200 for a verdict).
  // Temporary, and says nothing about the key.
  if (status === 429) {
    return { ok: true }
  }
  if (status >= 400) {
    return { ok: false, errorKey: 'byok_validate_failed_generic' }
  }

  let data: { ok?: unknown; code?: unknown } | null = null
  try {
    const decoded: unknown = JSON.parse(bodyText)
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      data = decoded as { ok?: unknown; code?: unknown }
    }
  } catch {
    // Non-JSON body (proxy/CDN error page) — inconclusive, not a key verdict.
  }
  if (!data) return { ok: true }
  if (data.ok === true) return { ok: true }

  // Explicit rate limiting is temporary — do not blame the key for it.
  if (data.code === 'rate-limited' || data.code === 'rate_limited') {
    return { ok: true }
  }

  const key = typeof data.code === 'string' ? CODE_TO_KEY[data.code] : undefined
  return { ok: false, errorKey: key ?? 'byok_validate_failed_generic' }
}
