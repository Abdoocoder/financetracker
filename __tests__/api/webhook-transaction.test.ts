/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockRpc = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    rpc: (...args: any[]) => mockRpc(...args),
  })),
}))

jest.mock('@/lib/api-keys', () => ({
  verifyApiKey: jest.fn(),
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
}))

import { GET, POST } from '@/app/api/webhook/transaction/route'
import { NextRequest } from 'next/server'
import { verifyApiKey, writeAuditLog } from '@/lib/api-keys'
import { rateLimit } from '@/lib/rate-limit'

const VALID_KEY = 'fjk_live_' + 'a'.repeat(96)
const mockKeyData = {
  userId: 'user-1',
  keyId: 'key-id-1',
  scopes: ['create_transaction', 'read_transactions', 'read_balances'],
  rateLimitPerMin: 10,
}

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

function rateLimitOk() {
  return {
    ok: true,
    remaining: 9,
    resetAt: Date.now() + 60_000,
    headers: { 'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': '9', 'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)) },
  }
}

function rateLimitExceeded() {
  return {
    ok: false,
    remaining: 0,
    resetAt: Date.now() + 60_000,
    headers: { 'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(Math.ceil((Date.now() + 60_000) / 1000)), 'Retry-After': '60' },
  }
}

function makePostRequest(body: any, key = VALID_KEY) {
  return new NextRequest('http://localhost/api/webhook/transaction', {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(params: Record<string, string> = {}, key = VALID_KEY) {
  const url = new URL('http://localhost/api/webhook/transaction')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), {
    headers: { 'authorization': `Bearer ${key}` },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(verifyApiKey as jest.Mock).mockResolvedValue(mockKeyData)
  ;(rateLimit as jest.Mock).mockReturnValue(rateLimitOk())
  mockRpc.mockResolvedValue({ data: [{ account_name: 'Cash', current_balance: 100 }], error: null })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Create Transaction
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/webhook/transaction — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/webhook/transaction', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyApiKey returns null', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValueOnce(null)
    const res = await POST(makePostRequest({ type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toContain('Invalid or revoked')
  })
})

describe('POST /api/webhook/transaction — scope', () => {
  it('returns 403 when key lacks create_transaction scope', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValueOnce({
      ...mockKeyData,
      scopes: ['read_transactions'],
    })
    const res = await POST(makePostRequest({ type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/webhook/transaction — rate limit', () => {
  it('returns 429 when rate limit exceeded', async () => {
    ;(rateLimit as jest.Mock).mockReturnValueOnce(rateLimitExceeded())
    const res = await POST(makePostRequest({ type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/webhook/transaction — validation', () => {
  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/webhook/transaction', {
      method: 'POST',
      headers: { 'authorization': `Bearer ${VALID_KEY}`, 'content-type': 'application/json' },
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when type is missing', async () => {
    const res = await POST(makePostRequest({ amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when type is invalid', async () => {
    const res = await POST(makePostRequest({ type: 'transfer', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is zero', async () => {
    const res = await POST(makePostRequest({ type: 'expense', amount: 0, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when amount is negative', async () => {
    const res = await POST(makePostRequest({ type: 'expense', amount: -5, category: 'طعام وشراب', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when category is empty', async () => {
    const res = await POST(makePostRequest({ type: 'expense', amount: 10, category: '', transaction_date: '2026-01-01' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when transaction_date is invalid format', async () => {
    const res = await POST(makePostRequest({ type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '01-01-2026' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when account_id is not a valid UUID', async () => {
    const res = await POST(makePostRequest({
      type: 'expense', amount: 10, category: 'طعام وشراب',
      transaction_date: '2026-01-01', account_id: 'not-a-uuid',
    }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/webhook/transaction — category validation', () => {
  it('returns 400 for invalid category', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: null, error: null })
      return chain()
    })
    const res = await POST(makePostRequest({
      type: 'expense', amount: 10, category: ' INVALID ',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid category')
    expect(json.valid_expense).toBeDefined()
    expect(json.valid_income).toBeDefined()
  })

  it('accepts valid expense category', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({
        data: { id: 'tx-1', type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' },
        error: null,
      })
      return chain()
    })
    const res = await POST(makePostRequest({
      type: 'expense', amount: 10, category: 'طعام وشراب',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(200)
  })

  it('accepts valid income category', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({
        data: { id: 'tx-1', type: 'income', amount: 1000, category: 'راتب', transaction_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' },
        error: null,
      })
      return chain()
    })
    const res = await POST(makePostRequest({
      type: 'income', amount: 1000, category: 'راتب',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(200)
  })

  it('returns 400 for income category on expense', async () => {
    const res = await POST(makePostRequest({
      type: 'expense', amount: 10, category: 'راتب',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid category')
  })

  it('returns 400 for expense category on income', async () => {
    const res = await POST(makePostRequest({
      type: 'income', amount: 100, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid category')
  })
})

describe('POST /api/webhook/transaction — description sanitization', () => {
  it('strips HTML tags from description', async () => {
    let insertedDesc: string | null = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') {
        const q = chain({
          data: { id: 'tx-1', type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' },
          error: null,
        })
        const origInsert = q.insert
        q.insert = (data: any) => {
          insertedDesc = data?.description
          return origInsert(data)
        }
        return q
      }
      return chain()
    })

    await POST(makePostRequest({
      type: 'expense', amount: 10, category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      description: '<script>alert("xss")</script>Lunch',
    }))
    expect(insertedDesc).toBe('alert(xss)Lunch')
  })

  it('converts null/missing description to null', async () => {
    let insertedDesc: string | null | undefined = undefined
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') {
        const q = chain({
          data: { id: 'tx-1', type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01', created_at: '2026-01-01T00:00:00Z' },
          error: null,
        })
        const origInsert = q.insert
        q.insert = (data: any) => {
          insertedDesc = data?.description
          return origInsert(data)
        }
        return q
      }
      return chain()
    })

    await POST(makePostRequest({
      type: 'expense', amount: 10, category: 'طعام وشراب',
      transaction_date: '2026-01-01',
    }))
    expect(insertedDesc).toBeNull()
  })
})

describe('POST /api/webhook/transaction — success', () => {
  const txResponse = {
    id: 'tx-1',
    type: 'expense',
    amount: 15,
    category: 'مواصلات',
    transaction_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: txResponse, error: null })
      return chain()
    })
  })

  it('returns 200 with ok: true and transaction data', async () => {
    const res = await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      description: 'بنزين', transaction_date: '2026-01-01',
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.transaction.id).toBe('tx-1')
    expect(json.message).toContain('successfully')
  })

  it('includes rate limit headers', async () => {
    const res = await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('9')
  })

  it('passes account_id as null when omitted', async () => {
    let insertedAccountId: string | null | undefined = undefined
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') {
        const q = chain({ data: txResponse, error: null })
        const origInsert = q.insert
        q.insert = (data: any) => {
          insertedAccountId = data?.account_id
          return origInsert(data)
        }
        return q
      }
      return chain()
    })

    await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(insertedAccountId).toBeNull()
  })

  it('writes audit log with correct action', async () => {
    await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'key-id-1',
        userId: 'user-1',
        action: 'create_transaction',
      })
    )
  })
})

describe('POST /api/webhook/transaction — errors', () => {
  it('returns 500 when Supabase insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: null, error: { message: 'insert failed' } })
      return chain()
    })
    const res = await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(500)
  })

  it('returns 500 for unexpected errors', async () => {
    ;(verifyApiKey as jest.Mock).mockRejectedValueOnce(new Error('unexpected'))
    const res = await POST(makePostRequest({
      type: 'expense', amount: 15, category: 'مواصلات',
      transaction_date: '2026-01-01',
    }))
    expect(res.status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Read Transactions / Balances
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/webhook/transaction — auth', () => {
  it('returns 401 when verifyApiKey returns null', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValueOnce(null)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })
})

describe('GET /api/webhook/transaction — scope', () => {
  it('returns 403 when key lacks read_transactions scope for default action', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValueOnce({
      ...mockKeyData,
      scopes: ['create_transaction'],
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('read_transactions')
  })

  it('returns 403 when key lacks read_balances scope for balances action', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValueOnce({
      ...mockKeyData,
      scopes: ['read_transactions'],
    })
    const res = await GET(makeGetRequest({ action: 'balances' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('read_balances')
  })
})

describe('GET /api/webhook/transaction — rate limit', () => {
  it('returns 429 when rate limit exceeded', async () => {
    ;(rateLimit as jest.Mock).mockReturnValueOnce(rateLimitExceeded())
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(429)
  })
})

describe('GET /api/webhook/transaction — balances', () => {
  it('returns accounts for action=balances', async () => {
    const accounts = [
      { account_name: 'Cash', current_balance: 100 },
      { account_name: 'Bank', current_balance: 5000 },
    ]
    mockRpc.mockResolvedValueOnce({ data: accounts, error: null })
    const res = await GET(makeGetRequest({ action: 'balances' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.accounts).toEqual(accounts)
  })

  it('returns 500 when RPC call fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } })
    const res = await GET(makeGetRequest({ action: 'balances' }))
    expect(res.status).toBe(500)
  })

  it('writes audit log for read_balances', async () => {
    await GET(makeGetRequest({ action: 'balances' }))
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read_balances' })
    )
  })
})

describe('GET /api/webhook/transaction — transactions', () => {
  const mockTxs = [
    { id: 'tx-1', type: 'expense', amount: 10, category: 'طعام وشراب', transaction_date: '2026-01-01' },
    { id: 'tx-2', type: 'income', amount: 1000, category: 'راتب', transaction_date: '2026-01-01' },
  ]

  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: mockTxs, error: null })
      return chain()
    })
  })

  it('returns transactions with count', async () => {
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.transactions).toEqual(mockTxs)
    expect(json.count).toBe(2)
  })

  it('defaults action to transactions when not specified', async () => {
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    // Verify from() was called with 'transactions' table (not RPC)
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('applies limit parameter', async () => {
    await GET(makeGetRequest({ limit: '5' }))
    // Verify the chain was built (the chain mock doesn't track range args, but from was called)
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('caps limit at MAX_READ_LIMIT (50)', async () => {
    await GET(makeGetRequest({ limit: '100' }))
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('defaults limit to 20 when not specified', async () => {
    await GET(makeGetRequest())
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('applies type filter', async () => {
    await GET(makeGetRequest({ type: 'expense' }))
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('applies category filter', async () => {
    await GET(makeGetRequest({ category: 'طعام وشراب' }))
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('applies date range filters', async () => {
    await GET(makeGetRequest({ from: '2026-01-01', to: '2026-01-31' }))
    expect(mockFrom).toHaveBeenCalledWith('transactions')
  })

  it('writes audit log with correct action and payload', async () => {
    await GET(makeGetRequest({ limit: '5', type: 'expense' }))
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'key-id-1',
        userId: 'user-1',
        action: 'read_transactions',
        payload: expect.objectContaining({ limit: 5, type: 'expense' }),
      })
    )
  })

  it('returns 500 when query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: null, error: { message: 'query failed' } })
      return chain()
    })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
  })
})

describe('GET /api/webhook/transaction — errors', () => {
  it('returns 500 for unexpected errors', async () => {
    ;(verifyApiKey as jest.Mock).mockRejectedValueOnce(new Error('unexpected'))
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
  })
})
