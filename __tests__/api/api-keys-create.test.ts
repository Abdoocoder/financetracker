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
  createApiKey: jest.fn(),
}))

import { POST } from '@/app/api/api-keys/create/route'
import { NextRequest } from 'next/server'
import { createApiKey } from '@/lib/api-keys'

function chain(data: any = { data: [], error: null }) {
  const obj: any = {
    then: (resolve: any) => Promise.resolve(data).then(resolve),
    catch: (reject: any) => Promise.resolve(data).catch(reject),
    finally: (fn: any) => Promise.resolve(data).finally(fn),
  }
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'limit', 'single', 'maybeSingle',
    'is', 'in', 'match', 'textSearch', 'head', 'range',
  ]
  methods.forEach(m => { obj[m] = () => chain(data) })
  return obj
}

function makeRequest(body: any, token = 'valid-token') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/api-keys/create', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_api_keys') return chain({ data: { count: 0 }, error: null })
    return chain()
  })
  ;(createApiKey as jest.Mock).mockImplementation(
    (userId: string, name: string, opts?: any) =>
      Promise.resolve({
        id: 'key-1',
        name,
        full_key: 'fjk_live_' + 'a'.repeat(96),
        key_prefix: 'fjk_live_aaaa...',
        scopes: opts?.scopes ?? ['create_transaction', 'read_transactions', 'read_balances'],
        rate_limit_per_min: 10,
        expires_at: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
  )
})

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when header does not start with Bearer', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/create', {
      method: 'POST',
      headers: { authorization: 'Basic abc' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when getUser returns error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('bad token') })
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when getUser returns no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(401)
  })
})

// ─── Name validation ─────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — name validation', () => {
  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid name')
  })

  it('returns 400 when name is empty', async () => {
    const res = await POST(makeRequest({ name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is whitespace only', async () => {
    const res = await POST(makeRequest({ name: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 100 chars', async () => {
    const res = await POST(makeRequest({ name: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('accepts name of exactly 100 chars', async () => {
    const res = await POST(makeRequest({ name: 'a'.repeat(100) }))
    expect(res.status).toBe(200)
  })

  it('accepts name of 1 char', async () => {
    const res = await POST(makeRequest({ name: 'a' }))
    expect(res.status).toBe(200)
  })
})

// ─── Scope validation ────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — scope validation', () => {
  it('returns 400 when scopes contain invalid value', async () => {
    const res = await POST(makeRequest({ name: 'Test', scopes: ['invalid_scope'] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid scope')
  })

  it('accepts valid scopes', async () => {
    const res = await POST(makeRequest({
      name: 'Test',
      scopes: ['create_transaction', 'read_transactions'],
    }))
    expect(res.status).toBe(200)
  })

  it('accepts omitted scopes (uses defaults)', async () => {
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(200)
  })
})

// ─── Key limit ───────────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — key limit', () => {
  it('returns 400 when user has 5 active keys', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') return chain({ data: null, count: 5, error: null })
      return chain()
    })
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Maximum 5')
  })

  it('proceeds when user has fewer than 5 active keys', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') return chain({ data: null, count: 3, error: null })
      return chain()
    })
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(200)
  })
})

// ─── Success ─────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — success', () => {
  it('returns ok: true with key data', async () => {
    const res = await POST(makeRequest({ name: 'My Key' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.full_key).toMatch(/^fjk_live_[a-f0-9]{96}$/)
    expect(json.name).toBe('My Key')
  })

  it('calls createApiKey with correct arguments', async () => {
    await POST(makeRequest({ name: 'My Key', scopes: ['read_transactions'] }))
    expect(createApiKey).toHaveBeenCalledWith('user-1', 'My Key', { scopes: ['read_transactions'] })
  })
})

// ─── Errors ──────────────────────────────────────────────────────────────────

describe('POST /api/api-keys/create — errors', () => {
  it('returns 500 when createApiKey throws', async () => {
    ;(createApiKey as jest.Mock).mockRejectedValueOnce(new Error('db error'))
    const res = await POST(makeRequest({ name: 'Test' }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })

  it('returns 500 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/api-keys/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer valid-token' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
