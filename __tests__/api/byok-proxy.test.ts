/**
 * @jest-environment node
 *
 * BYOK proxy route tests — auth paths (D1) + envelope/rate-limit/shape guardrails.
 *
 *   - Cookie-session path (web)     : createClient() with NO token + getUser() ok.
 *   - Bearer-JWT path (Flutter, D1) : createClient(<jwt>) + getUser() ok.
 * Uses the REAL providers allowlist (SSRF surface) and mocks envelope/supabase.
 */
var mockGetUser = jest.fn()
var mockRpc = jest.fn()
var mockCreateClient = jest.fn()
var mockUnwrapProviderKey = jest.fn()
var mockIsKekConfigured = jest.fn()
var mockZeroBytes = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/byok/envelope', () => ({
  unwrapProviderKey: (...args: any[]) => mockUnwrapProviderKey(...args),
  isKekConfigured: () => mockIsKekConfigured(),
  zeroBytes: (...args: any[]) => mockZeroBytes(...args),
}))

import { POST } from '@/app/api/byok/proxy/route'
import { NextRequest } from 'next/server'
import { BYOK_PROXY_LIMIT_PER_MIN } from '@/lib/byok/types'

beforeEach(() => {
  mockGetUser.mockReset()
  mockRpc.mockReset()
  mockCreateClient.mockReset()
  mockUnwrapProviderKey.mockReset().mockResolvedValue('sk-test-key')
  mockIsKekConfigured.mockReset().mockReturnValue(true)
  mockZeroBytes.mockReset()
  global.fetch = jest.fn()
})

type MockUser = { id: string }
function mockSupabaseReturn({ user = null, rpcData = 1, rpcError = null }: { user?: MockUser | null; rpcData?: unknown; rpcError?: unknown } = {}) {
  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })
  mockGetUser.mockResolvedValue({ data: { user }, error: null })
  mockRpc.mockResolvedValue({ data: rpcData, error: rpcError })
}

function makeProxyRequest(body: unknown, authHeader?: string) {
  const headers: Record<string, string> = {}
  if (authHeader) headers.authorization = authHeader
  const base = {
    providerId: 'openai',
    keyId: 'k1',
    env: Buffer.from('env').toString('base64'),
    payload: Buffer.from('payload').toString('base64'),
    body: Buffer.from('{"messages":[{"role":"user","content":"hi"}]}').toString('base64'),
  }
  return new NextRequest('http://localhost/api/byok/proxy', {
    method: 'POST',
    headers,
    body: JSON.stringify(typeof body === 'object' && body !== null ? { ...base, ...body } : body),
  })
}

const BEARER = 'Bearer eyJhbGciOiJSUzI1NiJ9.valid.jwt'

// ─── Auth: cookie session path ────────────────────────────────────────────────

describe('POST /api/byok/proxy — cookie-session auth (web, C1)', () => {
  it('returns 401 when there is no session and no bearer token', async () => {
    mockSupabaseReturn({ user: null })
    const res = await POST(makeProxyRequest({}))
    expect(res.status).toBe(401)
    // Falls back to the cookie client and NEVER the token path.
    expect(mockCreateClient).toHaveBeenCalledWith(undefined)
  })

  it('returns 200 for a valid cookie session (regression)', async () => {
    mockSupabaseReturn({ user: { id: 'u1' } })
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
    const res = await POST(makeProxyRequest({}))
    expect(res.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith(undefined)
    expect(mockGetUser).toHaveBeenCalled()
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://api.openai.com/v1/chat/completions')
  })
})

// ─── Auth: bearer JWT path (Flutter, D1) ──────────────────────────────────────

describe('POST /api/byok/proxy — bearer JWT auth (Flutter, D1)', () => {
  it('passes the JWT to createClient so the RPC runs as that user', async () => {
    mockSupabaseReturn({ user: { id: 'u2' } })
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const res = await POST(makeProxyRequest({}, BEARER))
    expect(res.status).toBe(200)
    expect(mockCreateClient).toHaveBeenCalledWith('eyJhbGciOiJSUzI1NiJ9.valid.jwt')
  })

  it('returns 401 when the bearer JWT is invalid/rejected', async () => {
    mockSupabaseReturn({ user: null })
    const res = await POST(makeProxyRequest({}, 'Bearer bad-jwt'))
    expect(res.status).toBe(401)
    expect(mockCreateClient).toHaveBeenCalledWith('bad-jwt')
  })
})

// ─── Envelope / validation guardrails ─────────────────────────────────────────

describe('POST /api/byok/proxy — validation guardrails', () => {
  beforeEach(() => mockSupabaseReturn({ user: { id: 'u1' } }))

  it('returns 404 for an unknown provider (SSRF allowlist)', async () => {
    const res = await POST(makeProxyRequest({ providerId: 'not-a-provider' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 for a clientDirect provider (no proxy)', async () => {
    const res = await POST(makeProxyRequest({ providerId: 'ollama' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when envelope fields are missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = makeProxyRequest({ env: undefined }) as any
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when the proxy KEK is not configured', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockIsKekConfigured.mockReturnValueOnce(false)
    const res = await POST(makeProxyRequest({}))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('BYOK_PRIVATE_KEY')
    expect(body.error).toContain('BYOK_KEK_ID')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[byok/proxy] KEK not configured: BYOK_PRIVATE_KEY=MISSING, BYOK_KEK_ID=')
    )
    errorSpy.mockRestore()
  })

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/byok/proxy', {
      method: 'POST',
      body: '{{{{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when the rate-limit RPC fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('rls denied') })
    const res = await POST(makeProxyRequest({}))
    expect(res.status).toBe(500)
  })
})

// ─── Key injection / upstream hardening ───────────────────────────────────────

describe('POST /api/byok/proxy — key injection (AD-4/C2)', () => {
  beforeEach(() => mockSupabaseReturn({ user: { id: 'u1' } }))

  it('injects the decrypted key and strips any client-supplied auth header', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const res = await POST(makeProxyRequest({
      headers: { authorization: 'Bearer client-sneaked-key' },
    }, BEARER))
    expect(res.status).toBe(200)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    const forwarded = init.headers as Headers
    expect(forwarded.get('authorization')).toBe('Bearer sk-test-key')
    // Client's own JWT (proxy auth) must NEVER leak upstream.
    expect(forwarded.get('authorization')).not.toContain('valid.jwt')
  })

  it('forwards body VERBATIM (C2 thin pass-through)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const reqBody = '{"messages":[{"role":"user","content":"hi"}],"model":"gpt-x"}'
    const res = await POST(makeProxyRequest({ body: Buffer.from(reqBody).toString('base64') }))
    expect(res.status).toBe(200)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect((init.body as Buffer).equals(Buffer.from(reqBody))).toBe(true)
    // zeroBytes must destroy the in-memory copy (AD-3/AD-4).
    expect(mockZeroBytes).toHaveBeenCalled()
  })

  it('applies anthropic default headers and overrides client x-api-key', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    )
    const res = await POST(makeProxyRequest({
      providerId: 'anthropic',
      headers: { 'x-api-key': 'spy-key', 'anthropic-version': '2023-06-01' },
    }))
    expect(res.status).toBe(200)
    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    const forwarded = init.headers as Headers
    expect(forwarded.get('x-api-key')).toBe('sk-test-key')
    expect(forwarded.get('x-api-key')).not.toBe('spy-key')
    expect(forwarded.get('anthropic-version')).toBe('2023-06-01')
    expect(forwarded.get('authorization')).toBeNull()
  })
})

// ─── Rate limit (AD-5) ────────────────────────────────────────────────────────

describe('POST /api/byok/proxy — per-user rate limit (AD-5)', () => {
  it('returns 429 with x-byok-origin: proxy when over the limit', async () => {
    mockSupabaseReturn({ user: { id: 'u1' }, rpcData: BYOK_PROXY_LIMIT_PER_MIN + 1 })
    const res = await POST(makeProxyRequest({}))
    expect(res.status).toBe(429)
    expect(res.headers.get('x-byok-origin')).toBe('proxy')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})