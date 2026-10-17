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

jest.mock('@/lib/timezone', () => ({
  getLocalNow: jest.fn(() => new Date('2026-09-10T06:00:00Z')),
  getZonedHourFromLocalNow: jest.requireActual('@/lib/timezone').getZonedHourFromLocalNow,
  isLocalMorningHour: jest.requireActual('@/lib/timezone').isLocalMorningHour,
}))

import { GET } from '@/app/api/daily-reminder/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'
import { getLocalNow } from '@/lib/timezone'

function makeGetRequest(url = 'http://localhost/api/daily-reminder') {
  return new NextRequest(url)
}

function countAwareChain(data: any = { data: [], error: null }) {
  const eqFilters: Record<string, any> = {}
  const obj: any = {}
  const compute = () => {
    const rows = data.data ?? []
    let filtered = rows
    if (eqFilters.transaction_date !== undefined) {
      filtered = rows.filter((r: any) => r.transaction_date === eqFilters.transaction_date)
    }
    return { data: filtered, count: filtered.length, error: null }
  }
  obj.then = (resolve: any) => Promise.resolve(compute()).then(resolve)
  obj.catch = (reject: any) => Promise.resolve(compute()).catch(reject)
  obj.finally = (fn: any) => Promise.resolve(compute()).finally(fn)
  obj.eq = (k: string, v: any) => { eqFilters[k] = v; return obj }
  obj.select = () => obj
  obj.order = () => obj
  obj.limit = () => obj
  return obj
}

function chain(data: any = { data: [], error: null }, eqFilters: Record<string, any> = {}) {
  const obj: any = {
    then: (resolve: any) => Promise.resolve(data).then(resolve),
    catch: (reject: any) => Promise.resolve(data).catch(reject),
    finally: (fn: any) => Promise.resolve(data).finally(fn),
  }
  obj.select = (cols?: any, opts?: any) => {
    if (opts?.count === 'exact') return countAwareChain(data)
    return chain(data, eqFilters)
  }
  obj.eq = (k: string, v: any) => {
    eqFilters[k] = v
    return chain(data, eqFilters)
  }
  const methods = [
    'insert', 'update', 'delete', 'upsert',
    'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'limit', 'single', 'maybeSingle',
    'is', 'in', 'match', 'textSearch', 'head',
  ]
  methods.forEach(m => { obj[m] = () => chain(data, eqFilters) })
  return obj
}

function setupMock({
  profiles = [] as any[],
  transactions = [] as any[],
} = {}) {
  mockFrom.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'transactions') return chain({ data: transactions, error: null })
    if (table === 'debts') return chain({ data: [], error: null })
    return chain()
  })
}

describe('GET /api/daily-reminder', () => {
  beforeEach(() => {
    ;(getLocalNow as jest.Mock).mockReturnValue(new Date('2026-09-10T06:00:00Z'))
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
    expect(json.sent).toBe(0)
  })

  it('sends morning reminder when user has no transactions today', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي', monthly_income: 1000 }] as any[],
      transactions: [] as any[],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('صباح الخير'),
      expect.stringContaining('ميزانيتك اليوم'),
      '/dashboard?quick=1',
      'daily-reminder'
    )
  })

  it('sends أحسنت reminder when user has transactions today', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي', monthly_income: 1000 }] as any[],
      transactions: [{ user_id: 'u1', transaction_date: '2026-09-10', type: 'expense', amount: 5 }] as any[],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('أحسنت'),
      expect.stringContaining('المتاح اليوم'),
      '/dashboard?quick=1',
      'daily-reminder'
    )
  })

  it('does NOT send the morning greeting at 3:20 AM in the user timezone', async () => {
    ;(getLocalNow as jest.Mock).mockReturnValue(new Date('2026-09-10T03:20:00Z'))
    setupMock({
      profiles: [
        { id: 'u1', full_name: 'أحمد علي', monthly_income: 1000, timezone: 'Asia/Amman' },
      ] as any[],
      transactions: [],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('does NOT send the morning greeting at 3:20 AM when no timezone is stored', async () => {
    ;(getLocalNow as jest.Mock).mockReturnValue(new Date('2026-09-10T03:20:00Z'))
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي', monthly_income: 1000 }] as any[],
      transactions: [],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('sends the greeting when it is morning in the user timezone, even if the server hour is not', async () => {
    // 01:00 server-local (UTC+3) → instant 22:00Z previous day → 07:00 in Asia/Tokyo
    ;(getLocalNow as jest.Mock).mockReturnValue(new Date('2026-09-10T01:00:00Z'))
    setupMock({
      profiles: [
        { id: 'u1', full_name: 'أحمد علي', monthly_income: 1000, timezone: 'Asia/Tokyo' },
      ] as any[],
      transactions: [],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('صباح الخير'),
      expect.any(String),
      '/dashboard?quick=1',
      'daily-reminder'
    )
  })
})