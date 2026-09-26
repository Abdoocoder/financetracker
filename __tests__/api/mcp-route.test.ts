/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockRpc = jest.fn()

var registeredTools: Record<string, { config: any; cb: (...a: any[]) => any }> = {}
var capturedFactory: any
var realAuthInfo = {}
var mcpFetch = jest.fn(async (_req: any, _opts?: any) =>
  new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }), { status: 200 })
)

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

jest.mock('@/lib/unified-tools', () => ({
  getAccountBalances: jest.fn(),
  getCashflowSummary: jest.fn(),
  createTransaction: jest.fn(),
  validateCategory: jest.fn(),
  getValidCategories: jest.fn(),
  checkAndReserveIdempotencyKey: jest.fn(),
  completeIdempotencyKey: jest.fn(),
  getTransactionById: jest.fn(),
  sanitizeDescription: jest.fn((d) => d?.replace(/<[^>]*>/g, '').replace(/[<>\"'&]/g, '').trim().slice(0, 500) ?? null),
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
}))

// Factory capture + McpServer recording, so we can exercise the real tool callbacks.
jest.mock('@modelcontextprotocol/server', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: (name: string, config: any, cb: any) => {
      registeredTools[name] = { config, cb }
    },
    registerPrompt: jest.fn(),
    registerResource: jest.fn(),
  })),
  createMcpHandler: jest.fn((factory: any) => {
    capturedFactory = factory
    return {
      fetch: function (request: any, opts?: any) {
        return mcpFetch(request, opts)
      },
      close: function () {},
      notify: function () {},
    }
  }),
}))

import { GET, POST, OPTIONS, DELETE } from '@/app/api/mcp/route'
import { NextRequest } from 'next/server'
import { verifyApiKey } from '@/lib/api-keys'
import * as unifiedTools from '@/lib/unified-tools'
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

function makeRequest(method = 'POST', key: string | null = VALID_KEY) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers['authorization'] = `Bearer ${key}`
  return new NextRequest(`http://localhost/api/mcp`, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call' }),
  })
}

/** A JSON-RPC `tools/call` request targeting a specific tool name. */
function makeToolCall(toolName: string, key: string | null = VALID_KEY) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key) headers['authorization'] = `Bearer ${key}`
  return new NextRequest('http://localhost/api/mcp', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: {} },
    }),
  })
}

/** Helpful: invoke a registered tool callback with the server-context the SDK would pass. */
function invokeTool(name: string, args: any, authInfo?: any) {
  const { cb } = registeredTools[name]
  const ctx = { http: { authInfo }, signal: undefined as any } as any
  return cb(args, ctx)
}

beforeEach(() => {
  ;(verifyApiKey as jest.Mock).mockReset().mockResolvedValue(mockKeyData)
  ;(rateLimit as jest.Mock).mockReset().mockReturnValue(rateLimitOk())
  ;(unifiedTools.writeAuditLog as jest.Mock).mockReset().mockResolvedValue(undefined)
  ;(unifiedTools.getAccountBalances as jest.Mock).mockReset().mockResolvedValue([])
  ;(unifiedTools.getCashflowSummary as jest.Mock).mockReset().mockResolvedValue({
    ok: true,
    period: { from: null, to: null },
    income: 0,
    expense: 0,
    net: 0,
    transaction_count: 0,
  })
  ;(unifiedTools.createTransaction as jest.Mock).mockReset().mockResolvedValue({
    id: 'tx-new-1',
    type: 'expense',
    amount: 50,
    category: 'طعام وشراب',
    transaction_date: '2026-01-01',
    created_at: new Date().toISOString(),
  })
  ;(unifiedTools.validateCategory as jest.Mock).mockReset().mockReturnValue(true)
  ;(unifiedTools.getValidCategories as jest.Mock).mockReset().mockReturnValue(['طعام وشراب', 'مواصلات'])
  ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockReset().mockResolvedValue({ status: 'available' })
  ;(unifiedTools.completeIdempotencyKey as jest.Mock).mockReset().mockResolvedValue(undefined)
  ;(unifiedTools.getTransactionById as jest.Mock).mockReset().mockResolvedValue(null)
  ;(unifiedTools.sanitizeDescription as jest.Mock).mockReset().mockImplementation((d) => d?.replace(/<[^>]*>/g, '').replace(/[<>\"'&]/g, '').trim().slice(0, 500) ?? null)
  ;(unifiedTools.writeAuditLog as jest.Mock).mockReset().mockResolvedValue(undefined)
  mockFrom.mockReset()
  mockFrom.mockReturnValue(chain())
  mockRpc.mockReset()
  mockRpc.mockResolvedValue({ data: [], error: null })
  mcpFetch.mockReset()
  mcpFetch.mockImplementation(async (_req: any, _opts?: any) =>
    new Response(JSON.stringify({ jsonrpc: '2.0', result: {} }), { status: 200 })
  )
  for (const k of Object.keys(registeredTools)) delete registeredTools[k]
  capturedFactory({ era: 'modern', authInfo: realAuthInfo })
})

describe('POST /api/mcp — authentication', () => {
  it('returns 401 when no Authorization header', async () => {
    const res = await POST(makeRequest('POST', null))
    expect(res.status).toBe(401)
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('returns 401 for a malformed header (not Bearer)', async () => {
    const req = new NextRequest('http://localhost/api/mcp', {
      method: 'POST',
      headers: { authorization: 'Basic abc', 'content-type': 'application/json' },
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when verifyApiKey rejects the key', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValue(null)
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(401)
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    ;(rateLimit as jest.Mock).mockReturnValue(rateLimitExceeded())
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(429)
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('forwards verified identity as AuthInfo to the MCP handler', async () => {
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(200)
    expect(mcpFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authInfo: {
          token: VALID_KEY,
          clientId: 'user-1',
          scopes: mockKeyData.scopes,
          extra: { keyId: 'key-id-1', rateLimitPerMin: 10 },
        },
      })
    )
  })

  it('applies per-method rate limit identifier', async () => {
    await POST(makeRequest('POST'))
    expect(rateLimit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 10, identifier: 'mcp:key-id-1' })
    )
  })
})

describe('HTTP-level scope gate (PRD §5.4 — 403 Forbidden)', () => {
  it('returns 403 Forbidden when a read-only key calls create_transaction', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValue({
      ...mockKeyData,
      scopes: ['read_transactions', 'read_balances'],
    })
    const res = await POST(makeToolCall('create_transaction'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('insufficient_scope')
    expect(body.required_scope).toBe('create_transaction')
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('returns 403 when a key lacks read_balances for get_balances', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValue({
      ...mockKeyData,
      scopes: ['read_transactions'],
    })
    const res = await POST(makeToolCall('get_balances'))
    expect(res.status).toBe(403)
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('blocks a batch where any tools/call lacks the scope', async () => {
    ;(verifyApiKey as jest.Mock).mockResolvedValue({
      ...mockKeyData,
      scopes: ['read_balances'],
    })
    const req = new NextRequest('http://localhost/api/mcp', {
      method: 'POST',
      headers: { authorization: `Bearer ${VALID_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_balances', arguments: {} } },
        { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'create_transaction', arguments: {} } },
      ]),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect((await res.json()).tool).toBe('create_transaction')
    expect(mcpFetch).not.toHaveBeenCalled()
  })

  it('passes tools/call through when the key has the required scope', async () => {
    const res = await POST(makeToolCall('get_balances'))
    expect(res.status).toBe(200)
    expect(mcpFetch).toHaveBeenCalledTimes(1)
  })

  it('ignores discovery and non-tool methods (initialize, tools/list)', async () => {
    for (const method of ['initialize', 'tools/list']) {
      mcpFetch.mockClear()
      const req = new NextRequest('http://localhost/api/mcp', {
        method: 'POST',
        headers: { authorization: `Bearer ${VALID_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mcpFetch).toHaveBeenCalledTimes(1)
    }
  })

  it('passes unknown tool names through to the SDK (its own -32602 error)', async () => {
    const res = await POST(makeToolCall('not_a_real_tool'))
    expect(res.status).toBe(200)
    expect(mcpFetch).toHaveBeenCalledTimes(1)
  })

  it('does not gate GET / OPTIONS / DELETE (no JSON-RPC body)', async () => {
    for (const method of ['GET', 'OPTIONS', 'DELETE']) {
      mcpFetch.mockClear()
      const res = await POST(makeRequest(method, VALID_KEY))
      expect(res.status).toBe(200)
      expect(mcpFetch).toHaveBeenCalledTimes(1)
    }
  })
})

describe('registerTool surface', () => {
  it('registers exactly the three required tools with names', () => {
    expect(Object.keys(registeredTools).sort()).toEqual([
      'create_transaction',
      'get_balances',
      'get_cashflow_summary',
    ])
  })
})

describe('scope gating in tool callbacks', () => {
  const fullAuth = {
    clientId: 'user-1',
    scopes: ['create_transaction', 'read_transactions', 'read_balances'],
    extra: { keyId: 'key-id-1', rateLimitPerMin: 10 },
  }
  const readOnlyAuth = {
    clientId: 'user-1',
    scopes: ['read_transactions'],
    extra: { keyId: 'key-id-1', rateLimitPerMin: 10 },
  }

  it('get_balances throws when key lacks read_balances scope', async () => {
    await expect(invokeTool('get_balances', {}, { ...readOnlyAuth })).rejects.toThrow(
      'read_balances'
    )
    expect(unifiedTools.getAccountBalances).not.toHaveBeenCalled()
  })

  it('get_balances calls get_account_balances RPC and writes audit with full scope', async () => {
    ;(unifiedTools.getAccountBalances as jest.Mock).mockResolvedValue([{ id: 'acct-1', balance: 100 }])
    const result = await invokeTool('get_balances', {}, { ...fullAuth })
    expect(unifiedTools.getAccountBalances).toHaveBeenCalledWith('user-1')
    expect(unifiedTools.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read_balances', userId: 'user-1', apiKeyId: 'key-id-1' })
    )
    expect(result.structuredContent.ok).toBe(true)
  })

  it('get_cashflow_summary throws when key lacks read_transactions scope', async () => {
    await expect(
      invokeTool('get_cashflow_summary', {}, { clientId: 'user-1', scopes: [], extra: { keyId: 'k1' } })
    ).rejects.toThrow('read_transactions')
  })

  it('get_cashflow_summary aggregates income and expense from transactions', async () => {
    ;(unifiedTools.getCashflowSummary as jest.Mock).mockResolvedValue({
      ok: true,
      period: { from: '2026-01-01', to: '2026-01-31' },
      income: 1000,
      expense: 500,
      net: 500,
      transaction_count: 3,
    })
    const result = await invokeTool('get_cashflow_summary', { from: '2026-01-01', to: '2026-01-31' }, { ...fullAuth })
    expect(result.structuredContent).toMatchObject({
      ok: true,
      income: 1000,
      expense: 500,
      net: 500,
      transaction_count: 3,
    })
    expect(unifiedTools.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'read_transactions', userId: 'user-1' })
    )
  })

  it('create_transaction throws when key lacks create_transaction scope', async () => {
    await expect(
      invokeTool('create_transaction', { type: 'expense', amount: 50, category: 'طعام وشراب', transaction_date: '2026-01-01' }, { ...readOnlyAuth })
    ).rejects.toThrow('create_transaction')
  })

  it('create_transaction rejects invalid categories', async () => {
    ;(unifiedTools.validateCategory as jest.Mock).mockReturnValue(false)
    const result = await invokeTool(
      'create_transaction',
      { type: 'expense', amount: 50, category: 'not-a-real-category', transaction_date: '2026-01-01' },
      { ...fullAuth }
    )
    expect(result.isError).toBe(true)
    expect(unifiedTools.createTransaction).not.toHaveBeenCalled()
  })

  it('create_transaction rejects income category on expense', async () => {
    ;(unifiedTools.validateCategory as jest.Mock).mockReturnValue(false)
    const result = await invokeTool(
      'create_transaction',
      { type: 'expense', amount: 50, category: 'راتب', transaction_date: '2026-01-01' },
      { ...fullAuth }
    )
    expect(result.isError).toBe(true)
    expect(unifiedTools.createTransaction).not.toHaveBeenCalled()
  })

  it('create_transaction rejects expense category on income', async () => {
    ;(unifiedTools.validateCategory as jest.Mock).mockReturnValue(false)
    const result = await invokeTool(
      'create_transaction',
      { type: 'income', amount: 50, category: 'مواصلات', transaction_date: '2026-01-01' },
      { ...fullAuth }
    )
    expect(result.isError).toBe(true)
    expect(unifiedTools.createTransaction).not.toHaveBeenCalled()
  })

  it('create_transaction inserts sanitized transaction and writes audit', async () => {
    ;(unifiedTools.createTransaction as jest.Mock).mockResolvedValue({
      id: 'tx-audit',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: new Date().toISOString(),
    })
    const result = await invokeTool(
      'create_transaction',
      { type: 'expense', amount: 50, category: 'طعام وشراب', description: '<b>lunch</b>', transaction_date: '2026-01-01' },
      { ...fullAuth }
    )
    expect(unifiedTools.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        description: 'lunch',
        transaction_date: '2026-01-01',
      })
    )
    expect(result.structuredContent.ok).toBe(true)
    expect(unifiedTools.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create_transaction', userId: 'user-1', apiKeyId: 'key-id-1' })
    )
  })

  it('OPTIONS and DELETE route through the MCP handler too', async () => {
    expect(OPTIONS).toBe(POST)
    expect(DELETE).toBe(POST)
    expect(GET).toBe(POST)
  })
})

describe('idempotency key handling in create_transaction', () => {
  const fullAuth = {
    clientId: 'user-1',
    scopes: ['create_transaction', 'read_transactions', 'read_balances'],
    extra: { keyId: 'key-id-1', rateLimitPerMin: 10 },
  }

  const idempotencyKey = 'idem-test-key-12345'

  beforeEach(() => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockReset()
    ;(unifiedTools.completeIdempotencyKey as jest.Mock).mockReset()
    ;(unifiedTools.getTransactionById as jest.Mock).mockReset()
    ;(unifiedTools.createTransaction as jest.Mock).mockReset()
    ;(unifiedTools.writeAuditLog as jest.Mock).mockReset().mockResolvedValue(undefined)
  })

  it('proceeds with transaction creation when idempotency key is new (available)', async () => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockResolvedValueOnce({ status: 'available' })
    ;(unifiedTools.completeIdempotencyKey as jest.Mock).mockResolvedValueOnce(undefined)
    ;(unifiedTools.createTransaction as jest.Mock).mockResolvedValueOnce({
      id: 'tx-new-1',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: new Date().toISOString(),
    })

    const result = await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
        idempotency_key: idempotencyKey,
      },
      { ...fullAuth }
    )

    expect(result.structuredContent.ok).toBe(true)
    expect(result.structuredContent.idempotent_replay).toBeUndefined()
    expect(unifiedTools.checkAndReserveIdempotencyKey).toHaveBeenCalledWith('user-1', expect.any(String))
    expect(unifiedTools.completeIdempotencyKey).toHaveBeenCalledWith('user-1', expect.any(String), 'tx-new-1')
  })

  it('returns existing transaction when idempotency key is duplicate', async () => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockResolvedValueOnce({
      status: 'duplicate',
      transaction_id: 'tx-existing-1',
    })
    ;(unifiedTools.getTransactionById as jest.Mock).mockResolvedValueOnce({
      id: 'tx-existing-1',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: '2026-01-01T12:00:00Z',
    })

    const result = await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
        idempotency_key: idempotencyKey,
      },
      { ...fullAuth }
    )

    expect(result.structuredContent.ok).toBe(true)
    expect(result.structuredContent.idempotent_replay).toBe(true)
    expect(result.structuredContent.transaction.id).toBe('tx-existing-1')
    expect(unifiedTools.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create_transaction_idempotent_replay' })
    )
    // Should NOT call completeIdempotencyKey or createTransaction
    expect(unifiedTools.completeIdempotencyKey).not.toHaveBeenCalled()
    expect(unifiedTools.createTransaction).not.toHaveBeenCalled()
  })

  it('returns error when idempotency key is still processing', async () => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockResolvedValueOnce({ status: 'processing' })

    const result = await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
        idempotency_key: idempotencyKey,
      },
      { ...fullAuth }
    )

    expect(result.isError).toBe(true)
    expect(JSON.parse(result.content[0].text).error).toContain('still being processed')
    expect(unifiedTools.createTransaction).not.toHaveBeenCalled()
  })

  it('works without idempotency_key (backwards compatible)', async () => {
    ;(unifiedTools.createTransaction as jest.Mock).mockResolvedValueOnce({
      id: 'tx-no-idem',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: new Date().toISOString(),
    })

    const result = await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
      },
      { ...fullAuth }
    )

    expect(result.structuredContent.ok).toBe(true)
    expect(result.structuredContent.idempotent_replay).toBeUndefined()
    // Should NOT call checkAndReserveIdempotencyKey
    expect(unifiedTools.checkAndReserveIdempotencyKey).not.toHaveBeenCalled()
  })

  it('logs audit with idempotency_key_hash when provided', async () => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockResolvedValueOnce({ status: 'available' })
    ;(unifiedTools.completeIdempotencyKey as jest.Mock).mockResolvedValueOnce(undefined)
    ;(unifiedTools.createTransaction as jest.Mock).mockResolvedValueOnce({
      id: 'tx-audit',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: new Date().toISOString(),
    })

    await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
        idempotency_key: idempotencyKey,
      },
      { ...fullAuth }
    )

    expect(unifiedTools.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create_transaction',
        userId: 'user-1',
        apiKeyId: 'key-id-1',
        payload: expect.objectContaining({
          idempotency_key_hash: expect.any(String),
        }),
      })
    )
  })

  it('does not fail request if complete_idempotency_key fails', async () => {
    ;(unifiedTools.checkAndReserveIdempotencyKey as jest.Mock).mockResolvedValueOnce({ status: 'available' })
    ;(unifiedTools.completeIdempotencyKey as jest.Mock).mockRejectedValueOnce(new Error('complete failed'))
    ;(unifiedTools.createTransaction as jest.Mock).mockResolvedValueOnce({
      id: 'tx-complete-fail',
      type: 'expense',
      amount: 50,
      category: 'طعام وشراب',
      transaction_date: '2026-01-01',
      created_at: new Date().toISOString(),
    })

    const result = await invokeTool(
      'create_transaction',
      {
        type: 'expense',
        amount: 50,
        category: 'طعام وشراب',
        transaction_date: '2026-01-01',
        idempotency_key: idempotencyKey,
      },
      { ...fullAuth }
    )

    expect(result.structuredContent.ok).toBe(true)
    expect(result.structuredContent.transaction.id).toBe('tx-complete-fail')
  })
})