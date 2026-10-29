/**
 * NVIDIA NIM catalogue invariants.
 *
 * Root cause this locks in: the previous catalogue offered three models that
 * had all been retired upstream. Selecting any of them made every chat call
 * fail with HTTP 410 (end of life) while the key itself was perfectly valid.
 * Verified live on 2026-10-29 against https://integrate.api.nvidia.com:
 *
 *   GET /v1/models -> 84 ids, none of the three old catalogue entries present
 *   POST /v1/chat/completions "meta/llama-3.1-8b-instruct"
 *     -> 410 {"status":410,"title":"Gone",
 *             "detail":"... reached its end of life on 2026-08-26T09:00:00Z"}
 *
 * Every slug below was read back from that live list, so a model can only be
 * added here after it has been seen upstream.
 */

import {
  SUPPORTED_PROVIDERS,
  NVIDIA_VALIDATION_MODEL,
  getProvider,
} from '@/lib/byok/providers'

/** Slugs that returned 410 / were absent from the live list on 2026-10-29. */
const RETIRED_SLUGS = [
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
]

/** Slugs confirmed present in the live list on 2026-10-29. */
const LIVE_SLUGS = [
  'nvidia/nemotron-3-super-120b-a12b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/nemotron-3.5-bolt-e4b',
  'nvidia/nemotron-nano-3-30b-a3b',
  'openai/gpt-oss-20b',
  'deepseek-ai/deepseek-v4.1-flash',
  'moonshotai/kimi-k2.6',
  'z-ai/glm-5.3-flash',
  'mistralai/mistral-large',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'google/gemma-4-31b-it',
]

describe('nvidia-nim catalogue', () => {
  const nvidia = SUPPORTED_PROVIDERS['nvidia-nim']!
  const models = nvidia.availableModels ?? []

  it('exists as a bearer-auth proxy to the fixed NVIDIA host', () => {
    expect(getProvider('nvidia-nim')).toBe(nvidia)
    expect(nvidia.kind).toBe('proxy')
    expect(nvidia.baseUrl).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(nvidia.auth).toEqual({ kind: 'bearer' })
    expect(nvidia.authHeaderName).toBe('authorization')
  })

  it('offers the live catalogue and nothing retired', () => {
    expect(models).toEqual(LIVE_SLUGS)
    for (const retired of RETIRED_SLUGS) {
      expect(models).not.toContain(retired)
    }
  })

  it('has no duplicates and every slug is provider-namespaced', () => {
    expect(new Set(models).size).toBe(models.length)
    for (const model of models) {
      expect(model).toBe(model.trim())
      expect(model).toMatch(/^[a-z0-9.-]+\/[a-z0-9.-]+$/)
    }
  })

  it('defaults to a model it actually offers', () => {
    expect(models).toContain(nvidia.defaultModel)
    expect(nvidia.defaultModel).toBe('nvidia/nemotron-3-ultra-550b-a55b')
  })

  it('validates with a live model that the UI also offers', () => {
    // The probe must never point at a slug the selector does not expose, or a
    // working key could be reported as broken (or vice versa).
    expect(models).toContain(NVIDIA_VALIDATION_MODEL)
    expect(LIVE_SLUGS).toContain(NVIDIA_VALIDATION_MODEL)
  })

  it('does not claim free models it cannot verify', () => {
    // Dropped rather than guessed: NVIDIA publishes no free/paid split for
    // these slugs, and a wrong badge is worse than no badge.
    expect(nvidia.freeModels).toBeUndefined()
  })
})
