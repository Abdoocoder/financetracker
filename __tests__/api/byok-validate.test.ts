/**
 * @jest-environment node
 *
 * BYOK key validation route — NVIDIA NIM probes a real completion.
 *
 * Root cause this locks in: NVIDIA's `GET /v1/models` answers **200 without a
 * key**, so the old validation returned "key works" for every string. Verified
 * live on 2026-10-29 against https://integrate.api.nvidia.com:
 *
 *   GET  /v1/models                      -> 200 (no auth required)
 *   POST /v1/chat/completions  bad key   -> 403 {"status":403,
 *                                              "title":"Forbidden",
 *                                              "detail":"Authorization failed"}
 *   POST /v1/chat/completions  retired   -> 410 about:blank (end of life)
 *   POST /v1/chat/completions  unknown   -> 404 "404 page not found" (text/plain)
 *
 * The probe must therefore be a POST to /v1/chat/completions using `max_tokens`
 * (NVIDIA does not accept OpenAI's `max_completion_tokens`) on a model that is
 * in the live catalogue.
 */
var mockGetUser = jest.fn()
var mockRpc = jest.fn()
var mockCreateClient = jest.fn()
var mockUnwrapProviderKeyWithRotation = jest.fn()
var mockIsKekConfigured = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}))

jest.mock('@/lib/byok/envelope', () => ({
  unwrapProviderKeyWithRotation: (...args: any[]) => mockUnwrapProviderKeyWithRotation(...args),
  isKekConfigured: () => mockIsKekConfigured(),
  zeroBytes: jest.fn(),
}))

import { POST } from '@/app/api/byok/validate/route'
import { NextRequest } from 'next/server'
import { SUPPORTED_PROVIDERS } from '@/lib/byok/providers'

const KEY = 'nvapi-test-key'
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

beforeEach(() => {
  mockGetUser.mockReset()
  mockRpc.mockReset()
  mockCreateClient.mockReset()
  mockUnwrapProviderKeyWithRotation.mockReset().mockResolvedValue(KEY)
  mockIsKekConfigured.mockReset().mockReturnValue(true)
  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  mockRpc.mockResolvedValue({ data: 1, error: null })
  global.fetch = jest.fn()
})

function makeValidateRequest(providerId = 'nvidia-nim') {
  return new NextRequest('http://localhost/api/byok/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      providerId,
      keyId: 'k1',
      env: Buffer.from('env').toString('base64'),
      payload: Buffer.from('payload').toString('base64'),
    }),
  })
}

function mockUpstream(response: Response) {
  ;(global.fetch as jest.Mock).mockResolvedValue(response)
  return global.fetch as jest.Mock
}

async function validate(providerId = 'nvidia-nim') {
  const res = await POST(makeValidateRequest(providerId))
  return { status: res.status, body: await res.json() }
}

describe('POST /api/byok/validate — NVIDIA NIM probe', () => {
  it('probes POST /v1/chat/completions, never GET /v1/models', async () => {
    const fetchMock = mockUpstream(new Response('{}', { status: 200 }))
    await validate()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(NVIDIA_URL)
    expect(init.method).toBe('POST')
  })

  it('sends the decrypted key as a bearer token and never leaks it in the body', async () => {
    const fetchMock = mockUpstream(new Response('{}', { status: 200 }))
    await validate()

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('authorization')).toBe(`Bearer ${KEY}`)
    expect(headers.get('content-type')).toBe('application/json')
    expect(String(init.body)).not.toContain(KEY)
  })

  it('uses max_tokens (not max_completion_tokens) and a live catalogue model', async () => {
    const fetchMock = mockUpstream(new Response('{}', { status: 200 }))
    await validate()

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init.body))
    expect(body.max_tokens).toBe(1)
    expect(body).not.toHaveProperty('max_completion_tokens')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    expect(SUPPORTED_PROVIDERS['nvidia-nim']!.availableModels).toContain(body.model)
  })

  it('200 -> ok', async () => {
    mockUpstream(new Response('{}', { status: 200 }))
    const { status, body } = await validate()
    expect(status).toBe(200)
    expect(body).toMatchObject({ ok: true })
  })

  it.each([401, 403])('%i -> auth failure code', async (code) => {
    mockUpstream(new Response('{"detail":"Authorization failed"}', { status: code }))
    const { status, body } = await validate()
    expect(status).toBe(200)
    expect(body).toMatchObject({ ok: false, code: 'auth' })
  })

  it('404 plain-text -> model-not-found (missing model access / bad slug)', async () => {
    mockUpstream(new Response('404 page not found', { status: 404 }))
    const { body } = await validate()
    expect(body).toMatchObject({ ok: false, code: 'model-not-found' })
  })

  it('410 -> model-unavailable (retired model)', async () => {
    mockUpstream(
      new Response(
        '{"title":"Gone","status":410,"detail":"The model has reached its end of life"}',
        { status: 410 }
      )
    )
    const { body } = await validate()
    expect(body).toMatchObject({ ok: false, code: 'model-unavailable' })
  })

  it('429 -> ok with rate_limited warning (a throttled key is still valid)', async () => {
    mockUpstream(new Response('{}', { status: 429 }))
    const { body } = await validate()
    expect(body).toMatchObject({ ok: true, warning: 'rate_limited' })
  })

  it.each([500, 502, 503])('%i -> provider-down', async (code) => {
    mockUpstream(new Response('{}', { status: code }))
    const { body } = await validate()
    expect(body).toMatchObject({ ok: false, code: 'provider-down' })
  })

  it('timeout -> timeout code', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('The operation was aborted'))
    const { body } = await validate()
    expect(body).toMatchObject({ ok: false, code: 'timeout' })
  })
})

describe('POST /api/byok/validate — other providers keep using the model list', () => {
  it('openai still probes GET /v1/models', async () => {
    const fetchMock = mockUpstream(new Response('{}', { status: 200 }))
    const { body } = await validate('openai')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/models')
    expect(init.method).toBe('GET')
    expect(body).toMatchObject({ ok: true })
  })

  it('rejects an unsupported provider before any upstream call', async () => {
    const { status } = await validate('not-a-provider')
    expect(status).toBe(404)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
