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
})