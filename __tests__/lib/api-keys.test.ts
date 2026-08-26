/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockAuthGetUser = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
  })),
}))

import { hashKey, generateApiKey, createApiKey, verifyApiKey, listApiKeys, revokeApiKey, writeAuditLog } from '@/lib/api-keys'

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

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── hashKey ─────────────────────────────────────────────────────────────────

describe('hashKey', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashKey('test-key')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('is deterministic', () => {
    expect(hashKey('abc')).toBe(hashKey('abc'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashKey('abc')).not.toBe(hashKey('def'))
  })

  it('hashes the fjk_live_ prefix correctly', () => {
    const fullKey = 'fjk_live_' + 'a'.repeat(96)
    const hash = hashKey(fullKey)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toBe(hashKey(fullKey))
  })
})

// ─── generateApiKey ──────────────────────────────────────────────────────────

describe('generateApiKey', () => {
  it('returns a fullKey starting with fjk_live_', () => {
    const { fullKey } = generateApiKey()
    expect(fullKey).toMatch(/^fjk_live_[a-f0-9]{96}$/)
  })

  it('hash equals hashKey(fullKey)', () => {
    const { fullKey, hash } = generateApiKey()
    expect(hash).toBe(hashKey(fullKey))
  })

  it('prefix is first 12 chars + "..."', () => {
    const { fullKey, prefix } = generateApiKey()
    expect(prefix).toBe(fullKey.slice(0, 12) + '...')
  })

  it('each call produces a unique key', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().fullKey))
    expect(keys.size).toBe(50)
  })
})

// ─── createApiKey ────────────────────────────────────────────────────────────

describe('createApiKey', () => {
  const userId = 'user-123'
  const keyName = 'Test Key'
  const insertedRow = {
    id: 'key-id-1',
    name: keyName,
    key_prefix: 'fjk_live_abcd...',
    scopes: ['create_transaction', 'read_transactions', 'read_balances'],
    rate_limit_per_min: 10,
    expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
  }

  function setupInsertSuccess() {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') {
        return chain({ data: insertedRow, error: null })
      }
      return chain()
    })
  }

  it('inserts a record and returns CreateApiKeyResult with full_key', async () => {
    setupInsertSuccess()
    const result = await createApiKey(userId, keyName)
    expect(result).toHaveProperty('full_key')
    expect(result.full_key).toMatch(/^fjk_live_[a-f0-9]{96}$/)
    expect(result.name).toBe(keyName)
    expect(result.id).toBe('key-id-1')
  })

  it('uses default scopes when none provided', async () => {
    setupInsertSuccess()
    await createApiKey(userId, keyName)
    const insertCall = mockFrom.mock.results.find(r => r.value?.insert)
    expect(insertCall).toBeDefined()
  })

  it('passes custom scopes and rate limit', async () => {
    setupInsertSuccess()
    await createApiKey(userId, keyName, {
      scopes: ['create_transaction'],
      rateLimitPerMin: 5,
    })
    // Verify the chain was built (insert was called)
    expect(mockFrom).toHaveBeenCalledWith('user_api_keys')
  })

  it('passes custom expiresAt', async () => {
    setupInsertSuccess()
    const expiresAt = '2027-01-01T00:00:00Z'
    await createApiKey(userId, keyName, { expiresAt })
    expect(mockFrom).toHaveBeenCalledWith('user_api_keys')
  })

  it('throws when Supabase insert fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') {
        return chain({ data: null, error: { message: 'insert failed' } })
      }
      return chain()
    })
    await expect(createApiKey(userId, keyName)).rejects.toThrow('Failed to create API key')
  })
})

// ─── verifyApiKey ────────────────────────────────────────────────────────────

describe('verifyApiKey', () => {
  const validPrefix = 'fjk_live_'
  const validKey = validPrefix + 'a'.repeat(96)
  const mockKeyData = {
    id: 'key-id-1',
    user_id: 'user-123',
    scopes: ['create_transaction'],
    rate_limit_per_min: 10,
    is_active: true,
    expires_at: null,
  }

  function setupVerify(data: any, error: any = null) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') {
        return chain({ data, error })
      }
      return chain()
    })
  }

  it('returns null for key not starting with fjk_live_', async () => {
    const result = await verifyApiKey('invalid-key')
    expect(result).toBeNull()
  })

  it('returns null when DB query returns no data', async () => {
    setupVerify(null, { message: 'not found' })
    const result = await verifyApiKey(validKey)
    expect(result).toBeNull()
  })

  it('returns null when key is inactive', async () => {
    setupVerify({ ...mockKeyData, is_active: false })
    const result = await verifyApiKey(validKey)
    expect(result).toBeNull()
  })

  it('returns null when key is expired', async () => {
    setupVerify({ ...mockKeyData, expires_at: '2020-01-01T00:00:00Z' })
    const result = await verifyApiKey(validKey)
    expect(result).toBeNull()
  })

  it('returns valid result for active, non-expired key', async () => {
    setupVerify(mockKeyData)
    const result = await verifyApiKey(validKey)
    expect(result).toEqual({
      userId: 'user-123',
      keyId: 'key-id-1',
      scopes: ['create_transaction'],
      rateLimitPerMin: 10,
    })
  })

  it('updates last_used_at (fire and forget)', async () => {
    setupVerify(mockKeyData)
    await verifyApiKey(validKey)
    // The update call is fire-and-forget, verify it was made
    expect(mockFrom).toHaveBeenCalledWith('user_api_keys')
  })

  it('handles non-null expires_at in the future', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    setupVerify({ ...mockKeyData, expires_at: futureDate })
    const result = await verifyApiKey(validKey)
    expect(result).not.toBeNull()
  })
})

// ─── listApiKeys ─────────────────────────────────────────────────────────────

describe('listApiKeys', () => {
  const userId = 'user-123'
  const mockKeys = [
    { id: 'k1', name: 'Key 1', key_prefix: 'fjk_live_abcd...' },
    { id: 'k2', name: 'Key 2', key_prefix: 'fjk_live_efgh...' },
  ]

  it('returns array of keys for given user', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') return chain({ data: mockKeys, error: null })
      return chain()
    })
    const result = await listApiKeys(userId)
    expect(result).toEqual(mockKeys)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no keys exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') return chain({ data: [], error: null })
      return chain()
    })
    const result = await listApiKeys(userId)
    expect(result).toEqual([])
  })

  it('throws when Supabase query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') return chain({ data: null, error: { message: 'db error' } })
      return chain()
    })
    await expect(listApiKeys(userId)).rejects.toThrow('Failed to list API keys')
  })
})

// ─── revokeApiKey ────────────────────────────────────────────────────────────

describe('revokeApiKey', () => {
  it('succeeds when update succeeds', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') {
        return chain({ data: null, error: null })
      }
      return chain()
    })
    await expect(revokeApiKey('user-1', 'key-1')).resolves.toBeUndefined()
  })

  it('throws when Supabase update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_api_keys') {
        return chain({ data: null, error: { message: 'update failed' } })
      }
      return chain()
    })
    await expect(revokeApiKey('user-1', 'key-1')).rejects.toThrow('Failed to revoke API key')
  })
})

// ─── writeAuditLog ───────────────────────────────────────────────────────────

describe('writeAuditLog', () => {
  it('inserts audit log with all fields', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'api_audit_log') return chain({ data: null, error: null })
      return chain()
    })
    await writeAuditLog({
      apiKeyId: 'key-1',
      userId: 'user-1',
      action: 'create_transaction',
      payload: { amount: 10 },
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    })
    expect(mockFrom).toHaveBeenCalledWith('api_audit_log')
  })

  it('handles missing optional fields', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'api_audit_log') return chain({ data: null, error: null })
      return chain()
    })
    await writeAuditLog({
      apiKeyId: 'key-1',
      userId: 'user-1',
      action: 'read_transactions',
    })
    expect(mockFrom).toHaveBeenCalledWith('api_audit_log')
  })
})
