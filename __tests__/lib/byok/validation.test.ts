/**
 * BYOK key-validation verdict mapping (web).
 *
 * Mirrors mobile `_classifyValidationResponse` in
 * `mobile/fajrak_flutter/lib/widgets/settings/byok_keys_section.dart`.
 *
 * Regression context (2026-10-29): `/api/byok/validate` used to answer
 * `!res.ok` → "Validation failed", and the settings UI showed whatever English
 * `error` string the route returned. NVIDIA's live `GET /v1/models` answers 200
 * with no key at all, so validation "passed" for every string, and once the
 * route switched to a real completion probe the raw upstream text leaked into
 * an Arabic UI.
 */
import {
  classifyValidationResponse,
  type ValidationVerdict,
} from '@/lib/byok/validation'

const GENERIC = 'byok_validate_failed_generic'

function expectVerdict(
  actual: ValidationVerdict,
  expected: ValidationVerdict
) {
  expect(actual.ok).toBe(expected.ok)
  if (expected.errorKey) expect(actual.errorKey).toBe(expected.errorKey)
  else expect(actual.errorKey).toBeUndefined()
}

describe('classifyValidationResponse', () => {
  describe('success', () => {
    it('accepts an explicit ok:true', () => {
      expectVerdict(classifyValidationResponse(200, '{"ok":true}'), { ok: true })
    })

    it('accepts ok:true that also carries a warning code', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":true,"code":"rate-limited","warning":"rate_limited"}'
        ),
        { ok: true }
      )
    })

    it('fails open on a non-JSON body (proxy/CDN error page)', () => {
      expectVerdict(classifyValidationResponse(200, '404 page not found'), {
        ok: true,
      })
    })

    it('fails open on an empty body', () => {
      expectVerdict(classifyValidationResponse(200, ''), { ok: true })
    })

    it('ignores a JSON array body', () => {
      expectVerdict(classifyValidationResponse(200, '[]'), { ok: true })
    })

    it('fails open on an HTTP 429 from an edge/CDN limiter', () => {
      expectVerdict(classifyValidationResponse(429, 'Too Many Requests'), {
        ok: true,
      })
    })
  })

  describe('session vs key', () => {
    it('treats 401 as an expired session, never an invalid key', () => {
      expectVerdict(classifyValidationResponse(401, '{"error":"Unauthorized"}'), {
        ok: false,
        errorKey: 'byok_keys_save_failed_auth',
      })
    })

    it('treats 403 as an expired session too', () => {
      expectVerdict(classifyValidationResponse(403, '{}'), {
        ok: false,
        errorKey: 'byok_keys_save_failed_auth',
      })
    })

    it('treats code:"auth" as a rejected key', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":false,"code":"auth","error":"Invalid key"}'
        ),
        { ok: false, errorKey: 'byok_validate_failed_auth' }
      )
    })
  })

  describe('model problems are not key problems', () => {
    it('maps code:"model-not-found" to the model message', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":false,"code":"model-not-found","error":"Model not found"}'
        ),
        { ok: false, errorKey: 'byok_validate_failed_model' }
      )
    })

    it('maps code:"model-unavailable" (upstream 410) to the model message', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":false,"code":"model-unavailable","error":"Model unavailable"}'
        ),
        { ok: false, errorKey: 'byok_validate_failed_model' }
      )
    })
  })

  describe('provider problems', () => {
    it('maps code:"provider-down" to the outage message', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":false,"code":"provider-down","error":"Provider unavailable"}'
        ),
        { ok: false, errorKey: 'byok_validate_failed_unavailable' }
      )
    })

    it('maps a 5xx route response to the outage message', () => {
      expectVerdict(classifyValidationResponse(502, '{}'), {
        ok: false,
        errorKey: 'byok_validate_failed_unavailable',
      })
    })
  })

  describe('fallbacks', () => {
    it('maps an unknown code to the generic message', () => {
      expectVerdict(
        classifyValidationResponse(
          200,
          '{"ok":false,"code":"validation-failed","error":"Validation failed"}'
        ),
        { ok: false, errorKey: GENERIC }
      )
    })

    it('maps ok:false with no code to the generic message', () => {
      expectVerdict(classifyValidationResponse(200, '{"ok":false}'), {
        ok: false,
        errorKey: GENERIC,
      })
    })

    it('maps a 4xx route response to the generic message', () => {
      expectVerdict(classifyValidationResponse(400, '{"error":"Invalid JSON body"}'), {
        ok: false,
        errorKey: GENERIC,
      })
    })

    it('never surfaces the route\'s raw English error text', () => {
      const verdict = classifyValidationResponse(
        200,
        '{"ok":false,"code":"auth","error":"Invalid key"}'
      )
      expect(verdict.errorKey).not.toContain('Invalid key')
      expect(verdict.errorKey).toMatch(/^byok_/)
    })
  })
})
