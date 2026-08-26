/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  })),
}))

jest.mock('@/lib/api-keys', () => ({
  revokeApiKey: jest.fn(),
}))

import { POST } from '@/app/api/api-keys/revoke/route'
import { NextRequest } from 'next/server'
import { revokeApiKey } from '@/lib/api-keys'

function makeRequest(body: any, token = 'valid-token') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/api-keys/revoke', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  ;(revokeApiKey as jest.Mock).mockResolvedValue(undefined)
})

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/revoke — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_id: 'k1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when header does not start with Bearer', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/revoke', {
      method: 'POST',
      headers: { authorization: 'Basic abc' },
      body: JSON.stringify({ key_id: 'k1' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when getUser returns error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('bad') })
    const res = await POST(makeRequest({ key_id: 'k1' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when getUser returns no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await POST(makeRequest({ key_id: 'k1' }))
    expect(res.status).toBe(401)
  })
})

// ─── Input validation ────────────────────────────────────────────────────────

describe('POST /api/api-keys/revoke — input validation', () => {
  it('returns 400 when key_id is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Missing key_id')
  })

  it('returns 400 when key_id is empty string', async () => {
    const res = await POST(makeRequest({ key_id: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when key_id is null', async () => {
    const res = await POST(makeRequest({ key_id: null }))
    expect(res.status).toBe(400)
  })
})

// ─── Success ─────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/revoke — success', () => {
  it('returns ok: true', async () => {
    const res = await POST(makeRequest({ key_id: 'key-to-revoke' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it('calls revokeApiKey with correct user and key_id', async () => {
    await POST(makeRequest({ key_id: 'key-abc' }))
    expect(revokeApiKey).toHaveBeenCalledWith('user-1', 'key-abc')
  })
})

// ─── Errors ──────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/revoke — errors', () => {
  it('returns 500 when revokeApiKey throws', async () => {
    ;(revokeApiKey as jest.Mock).mockRejectedValueOnce(new Error('db error'))
    const res = await POST(makeRequest({ key_id: 'k1' }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })

  it('returns 500 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer valid-token' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
