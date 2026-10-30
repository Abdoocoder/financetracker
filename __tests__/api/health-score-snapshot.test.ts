/**
 * @jest-environment node
 */

// ── Mock Supabase before any imports ──────────────────────────────────────────
import { createMockSupabase, makeRequest } from '../helpers/supabase-mock'

var mockSupabase: ReturnType<typeof createMockSupabase>;

jest.mock('@supabase/supabase-js', () => {
  const { createMockSupabase } = require('../helpers/supabase-mock');
  mockSupabase = createMockSupabase();
  return {
    createClient: jest.fn(() => mockSupabase),
  }
})

import { GET } from '@/app/api/health-score-snapshot/route'

// ── Environment ───────────────────────────────────────────────────────────────
const SECRET = 'test-secret'

const U1 = '11111111-1111-4111-8111-111111111111'
const U2 = '22222222-2222-4222-8222-222222222222'
const U3 = '33333333-3333-4333-8333-333333333333'

const TODAY = new Date().toISOString().split('T')[0]

beforeEach(() => {
  process.env.CRON_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  mockSupabase = createMockSupabase()
})

/** Tables touched by the route, in the order the route first queries them. */
const EXPECTED_TABLES = [
  'profiles',
  'transactions',
  'debts',
  'investments',
  'savings_goals',
  'health_score_history',
]

/** All queries issued against `table`, in call order. */
function queriesFor(table: string) {
  const calls = mockSupabase.from.mock.calls as unknown as Array<[string]>
  const results = mockSupabase.from.mock.results as unknown as Array<{ value: any }>
  return results
    .map((result, index) => ({ table: calls[index][0], query: result.value }))
    .filter((entry) => entry.table === table)
    .map((entry) => entry.query)
}

// ── Auth guard ────────────────────────────────────────────────────────────────
describe('GET /api/health-score-snapshot — auth', () => {
  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 401 with wrong token', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: 'bad-token' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct token', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, saved: 0 })
  })
})

// ── N+1 regression: query count must not scale with user count ────────────────
describe('GET /api/health-score-snapshot — query batching', () => {
  it('issues a constant number of queries regardless of how many users exist', async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: [
          { id: U1, monthly_income: 1000 },
          { id: U2, monthly_income: 2000 },
          { id: U3, monthly_income: 3000 },
        ],
        error: null,
      },
    })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, saved: 3 })

    // 5 reads (profiles + 4 set-based) + 1 batched upsert. Never 5 per user.
    expect(mockSupabase.from).toHaveBeenCalledTimes(6)
    for (const table of EXPECTED_TABLES) {
      expect(queriesFor(table)).toHaveLength(1)
    }
  })

  it('filters the set-based queries by the batch of user ids', async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: [
          { id: U1, monthly_income: 1000 },
          { id: U2, monthly_income: 2000 },
        ],
        error: null,
      },
    })

    await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    for (const table of ['transactions', 'debts', 'investments', 'savings_goals']) {
      const [query] = queriesFor(table)
      expect(query.in).toHaveBeenCalledWith('user_id', [U1, U2])
    }
  })

  it('writes every user in a single upsert', async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: [
          { id: U1, monthly_income: 1000 },
          { id: U2, monthly_income: 2000 },
        ],
        error: null,
      },
    })

    await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    const [history] = queriesFor('health_score_history')
    expect(history.upsert).toHaveBeenCalledTimes(1)
    const [rows, options] = history.upsert.mock.calls[0]
    expect(rows).toHaveLength(2)
    expect(options).toEqual({ onConflict: 'user_id,recorded_at' })
    expect(rows.map((row: { user_id: string }) => row.user_id)).toEqual([U1, U2])
    expect(rows.every((row: { recorded_at: string }) => row.recorded_at === TODAY)).toBe(true)
  })

  it('still calls the database RPC once per user — score math is never reimplemented in JS', async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: [
          { id: U1, monthly_income: 1000 },
          { id: U2, monthly_income: 2000 },
        ],
        error: null,
      },
    })

    await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_health_score', { p_user_id: U1 })
    expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_health_score', { p_user_id: U2 })
  })

  it('caps RPC concurrency at 10 in flight', async () => {
    let inFlight = 0
    let peak = 0
    mockSupabase = createMockSupabase({
      profiles: {
        data: Array.from({ length: 25 }, (_, i) => ({
          id: `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
          monthly_income: 1000,
        })),
        error: null,
      },
    })
    mockSupabase.rpc.mockImplementation(async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
      return { data: 50, error: null }
    })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    expect(await res.json()).toMatchObject({ ok: true, saved: 25 })
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(25)
    expect(peak).toBeLessThanOrEqual(10)
  })
})

// ── Aggregation correctness (in-memory grouping replaces per-user queries) ────
describe('GET /api/health-score-snapshot — aggregation', () => {
  it('sums transactions, debts, investments and goals per user', async () => {
    mockSupabase = createMockSupabase({
      profiles: {
        data: [
          { id: U1, monthly_income: 1000 },
          { id: U2, monthly_income: 2000 },
        ],
        error: null,
      },
      transactions: {
        data: [
          { user_id: U1, type: 'income', amount: 5000 },
          { user_id: U1, type: 'expense', amount: 1200 },
          { user_id: U1, type: 'transfer', amount: 999 }, // ignored, as before
          { user_id: U2, type: 'expense', amount: 300 },
        ],
        error: null,
      },
      debts: {
        data: [
          { user_id: U1, remaining_amount: 4000 },
          { user_id: U1, remaining_amount: 1000 },
        ],
        error: null,
      },
      investments: {
        data: [{ user_id: U2, shares: 10, current_price: 25 }],
        error: null,
      },
      savings_goals: {
        data: [{ user_id: U2, current_amount: 750 }],
        error: null,
      },
    })
    mockSupabase.rpc.mockImplementation(
      async (_fn: string, params: { p_user_id: string }) => ({
        data: params.p_user_id === U1 ? 70 : 40,
        error: null,
      })
    )

    await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    const [history] = queriesFor('health_score_history')
    const [rows] = history.upsert.mock.calls[0]
    const [u1, u2] = rows

    expect(u1).toMatchObject({
      user_id: U1,
      score: 70,
      income: 5000, // transaction income wins over monthly_income
      expenses: 1200,
      total_debt: 5000,
      inv_value: 0,
      goals_saved: 0,
    })

    expect(u2).toMatchObject({
      user_id: U2,
      score: 40,
      income: 2000, // no transaction income → falls back to monthly_income
      expenses: 300,
      total_debt: 0,
      inv_value: 250,
      goals_saved: 750,
    })
  })

  it('ignores rows belonging to users outside the batch', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [{ id: U1, monthly_income: 1000 }], error: null },
      transactions: {
        data: [
          { user_id: U1, type: 'expense', amount: 100 },
          { user_id: U2, type: 'expense', amount: 900 },
        ],
        error: null,
      },
    })

    await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    const [history] = queriesFor('health_score_history')
    const [rows] = history.upsert.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: U1, expenses: 100 })
  })

  it('scopes everything to a single user when ?userId is supplied', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [{ id: U1, monthly_income: 1000 }], error: null },
    })

    const res = await GET(
      makeRequest(`/api/health-score-snapshot?userId=${U1}`, { secret: SECRET })
    )

    expect(await res.json()).toMatchObject({ ok: true, saved: 1 })
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_health_score', { p_user_id: U1 })
  })

  it('rejects a malformed ?userId instead of passing it to the query', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [], error: null },
    })

    const res = await GET(
      makeRequest('/api/health-score-snapshot?userId=not-a-uuid', { secret: SECRET })
    )

    expect(await res.json()).toMatchObject({ ok: true, saved: 0 })
    // No filter applied → the query builder never saw an .eq('id', ...) call.
    const [profilesQuery] = queriesFor('profiles')
    expect(profilesQuery.eq).not.toHaveBeenCalled()
  })
})

// ── Fail loudly: never persist a zeroed snapshot ──────────────────────────────
describe('GET /api/health-score-snapshot — failure handling', () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('returns 500 and writes nothing when a batch query fails', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [{ id: U1, monthly_income: 1000 }], error: null },
      transactions: { data: null, error: { message: 'boom' } },
    })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain('transactions')
    expect(queriesFor('health_score_history')).toHaveLength(0)
  })

  it('returns 500 and writes nothing when the profiles query fails', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: null, error: { message: 'profiles down' } },
    })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    expect(res.status).toBe(500)
    expect(queriesFor('health_score_history')).toHaveLength(0)
  })

  it('returns 500 and writes nothing when the score RPC fails', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [{ id: U1, monthly_income: 1000 }], error: null },
    })
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'rpc down' } })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))

    expect(res.status).toBe(500)
    expect(queriesFor('health_score_history')).toHaveLength(0)
  })

  it('returns 500 when the upsert fails', async () => {
    mockSupabase = createMockSupabase({
      profiles: { data: [{ id: U1, monthly_income: 1000 }], error: null },
    })

    const originalFrom = mockSupabase.from.getMockImplementation()!
    mockSupabase.from.mockImplementation((table: string) => {
      const query = originalFrom(table)
      if (table === 'health_score_history') {
        query.upsert = jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'unique violation' } })
      }
      return query
    })

    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))
    expect(res.status).toBe(500)
  })
})
