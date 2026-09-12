/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn()

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

import { GET } from '@/app/api/evening-reminder/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makeGetRequest(url = 'http://localhost/api/evening-reminder') {
  return new NextRequest(url)
}

function chain(data: any = { data: [], error: null, count: 0 }) {
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
  debts = [] as any[],
  investments = [] as any[],
  goals = [] as any[],
  alertsCount = 0,
} = {}) {
  mockFrom.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'transactions') return chain({ data: transactions, error: null })
    if (table === 'debts') return chain({ data: debts, error: null })
    if (table === 'investments') return chain({ data: investments, error: null })
    if (table === 'savings_goals') return chain({ data: goals, error: null })
    if (table === 'alerts') {
      const alertData = alertsCount > 0 ? [
        { user_id: 'u1', title: '🚨 تجاوزت 90% من دخلك!' },
        { user_id: 'u1', title: '⚠️ مصاريفك تجاوزت 75% من دخلك' },
      ] : []
      return chain({ data: alertData, count: alertsCount, error: null })
    }
    return chain()
  })
}

describe('GET /api/evening-reminder', () => {
  it('returns 401 when cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with sent=0 when no profiles exist', async () => {
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(0)
  })

  it('sends reminders to all users when no userId specified', async () => {
    setupMock({
      profiles: [
        { id: 'u1', full_name: 'أحمد علي' },
        { id: 'u2', full_name: 'محمد خالد' },
      ] as any[],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(2)
    expect(sendPushToUser).toHaveBeenCalledTimes(2)
  })

  it('sends reminders with correct messages for users with 0 transactions', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[],
      transactions: [] as any[],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('لم تسجل اليوم'),
      expect.stringContaining('سجّل الآن'),
      '/dashboard/transactions',
      'evening-reminder'
    )
  })
})