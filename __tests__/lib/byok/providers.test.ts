import { SUPPORTED_PROVIDERS, getProvider } from '@/lib/byok/providers'

describe('SUPPORTED_PROVIDERS SSRF allowlist invariants', () => {
  it('identity: every key resolves to a provider whose id matches', () => {
    for (const [id, p] of Object.entries(SUPPORTED_PROVIDERS)) {
      expect(p.id).toBe(id)
      expect(p.name).toBeTruthy()
      expect(p.defaultModel).toBeTruthy()
      expect(p.baseUrl).toBeTruthy()
      expect(getProvider(id)).toBe(p)
    }
  })

  it('proxy providers only ever dial fixed https upstreams — no open relay', () => {
    for (const p of Object.values(SUPPORTED_PROVIDERS)) {
      if (p.kind !== 'proxy') continue
      expect(p.baseUrl.startsWith('https://')).toBe(true)
      // The allowlist must be a literal host, not CLIENT-controlled input:
      // a baseUrl with interpolation/query injection would break the SSRF guard.
      expect(p.baseUrl).not.toMatch(/\$\{/)
      expect(p.baseUrl).not.toMatch(/[{}\s]/)
      // A proxy provider MUST strip an auth header the client could smuggle.
      expect(p.authHeaderName).toBeTruthy()
      expect(p.auth.kind).not.toBe('none')
    }
  })

  it('auth header name matches each provider auth style', () => {
    expect(SUPPORTED_PROVIDERS.anthropic.auth).toEqual({ kind: 'x-api-key' })
    expect(SUPPORTED_PROVIDERS.anthropic.authHeaderName).toBe('x-api-key')
    expect(SUPPORTED_PROVIDERS.gemini.auth).toEqual({ kind: 'x-goog-api-key' })
    expect(SUPPORTED_PROVIDERS.gemini.authHeaderName).toBe('x-goog-api-key')
    for (const id of ['openai', 'nvidia-nim', 'openrouter']) {
      expect(SUPPORTED_PROVIDERS[id]!.auth).toEqual({ kind: 'bearer' })
      expect(SUPPORTED_PROVIDERS[id]!.authHeaderName).toBe('authorization')
    }
  })

  it('anthropic always sends its version header', () => {
    expect(SUPPORTED_PROVIDERS.anthropic.defaultHeaders).toEqual({ 'anthropic-version': '2023-06-01' })
  })

  it('ollama is the only clientDirect provider and routes to localhost', () => {
    const direct = Object.values(SUPPORTED_PROVIDERS).filter(p => p.kind === 'clientDirect')
    expect(direct).toHaveLength(1)
    expect(direct[0]!.id).toBe('ollama')
    expect(SUPPORTED_PROVIDERS.ollama.baseUrl).toMatch(/localhost|127\.0\.0\.1/)
    expect(SUPPORTED_PROVIDERS.ollama.auth).toEqual({ kind: 'none' })
    expect(SUPPORTED_PROVIDERS.ollama.authHeaderName).toBe('')
  })

  it('rejects unknown provider ids', () => {
    expect(getProvider('not-a-provider')).toBeUndefined()
  })
})