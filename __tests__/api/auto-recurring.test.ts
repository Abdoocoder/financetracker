/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn()
var mockGetLocalNow = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/timezone', () => ({
  getLocalNow: () => mockGetLocalNow() ?? new Date('2026-09-10T06:00:00Z'),
}))

import { GET } from '@/app/api/auto-recurring/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makeGetRequest(url = 'http://localhost/api/auto-recurring') {
  return new NextRequest(url)
}

// Chain proxy that supports fluent query building and resolves to `data` when awaited
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
    'is', 'in', 'match', 'textSearch', 'head',
  ]
  methods.forEach(m => { obj[m] = () => chain(data) })
  return obj
}

function setupMock({
  profiles = [] as any[],
  transactions = [] as any[],
  savingsGoals = [] as any[],
} = {}) {
  mockFrom.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()
  mockGetLocalNow.mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'transactions') return chain({ data: transactions, error: null })
    if (table === 'savings_goals') return chain({ data: savingsGoals, error: null })
    return chain()
  })
}

/** Fingerprints passed to sendPushToUser, in call order. */
const fingerprints = () =>
  (sendPushToUser as jest.Mock).mock.calls.map(call => call[6])

/** Local "today" for the frozen clock used in these tests. */
const TODAY = '2026-09-10'

describe('GET /api/auto-recurring', () => {
  beforeEach(() => {
    mockGetLocalNow.mockReturnValueOnce(new Date('2026-09-10T10:00:00Z'))
  })

  it('returns 401 when cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock({ profiles: [], transactions: [] })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with sent=0 when no profiles', async () => {
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.auto).toBe(0)
    expect(json.reminders).toBe(0)
  })

  it('processes recurring transactions for users', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[],
      transactions: [] as any[],
      savingsGoals: [] as any[],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.auto).toBeGreaterThanOrEqual(0)
  })

  // ── Fingerprints: `${userId}:${tag}:${date}` is identical for every recurring
  // item of a user, so it would dedupe all but the first push. Each push must
  // carry a per-item fingerprint.
  it('passes a per-template fingerprint for legacy recurring transactions', async () => {
    setupMock({
      transactions: [
        {
          id: 't1', user_id: 'u1', type: 'expense', amount: 100,
          category: 'Food', description: 'غداء', recurring_auto: true,
        },
        {
          id: 't2', user_id: 'u1', type: 'expense', amount: 200,
          category: 'Fuel', description: 'بنزين', recurring_auto: false,
        },
      ] as any[],
    })

    await GET(makeGetRequest())

    const sent = fingerprints()
    expect(sent).toHaveLength(2)
    expect(new Set(sent).size).toBe(2)
    expect(sent).toEqual([
      `recurring:u1:t1:${TODAY}`,
      `recurring:u1:t2:${TODAY}`,
    ])
  })

  it('passes a per-item fingerprint for recurring_transactions', async () => {
    setupMock({ transactions: [] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'transactions') return chain({ data: [], error: null })
      if (table === 'recurring_transactions') {
        return chain({ data: [
          { id: 'r1', user_id: 'u9', type: 'expense', amount: 15, currency: 'JOD', category: 'Entertainment', name: 'Netflix', notes: null, frequency: 'monthly' },
          { id: 'r2', user_id: 'u9', type: 'expense', amount: 10, currency: 'JOD', category: 'Entertainment', name: 'Spotify', notes: null, frequency: 'monthly' },
        ], error: null })
      }
      return chain()
    })

    await GET(makeGetRequest())

    const sent = fingerprints()
    expect(sent).toHaveLength(2)
    expect(new Set(sent).size).toBe(2)
    expect(sent).toEqual([
      `recurring:u9:r1:${TODAY}`,
      `recurring:u9:r2:${TODAY}`,
    ])
  })
})
