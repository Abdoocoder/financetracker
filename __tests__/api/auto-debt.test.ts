/**
 * @jest-environment node
 */
var mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: jest.fn() }
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { GET } from '@/app/api/auto-debt/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

type QueryCall = { method: string; args: any[] }

/** Every query built during one test, grouped by table. */
let queryLog: Array<{ table: string; calls: QueryCall[] }>

// Robust chaining mock helper. Every builder call is recorded so tests can
// assert on the filters the route applies (e.g. soft-delete guards).
const chain = (data: any = { data: [], error: null }, calls: QueryCall[] = []) => {
  const obj: any = {
    then: (resolve: any) => resolve(data),
    catch: (reject: any) => reject(new Error('Mock chain error')),
  };
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single', 'rpc', 'is', 'in', 'match'];
  methods.forEach(m => {
    obj[m] = (...args: any[]) => {
      calls.push({ method: m, args });
      return chain(data, calls);
    };
  });
  return obj;
};

/** Builds a query chain for `table` and records it in the query log. */
const track = (table: string, data: any = { data: [], error: null }) => {
  const calls: QueryCall[] = [];
  queryLog.push({ table, calls });
  return chain(data, calls);
};

/** Every builder call issued against `table`, across all of its queries. */
const callsFor = (table: string) =>
  queryLog.filter(entry => entry.table === table).flatMap(entry => entry.calls);

/** Fingerprints passed to sendPushToUser, in call order. */
const fingerprints = () =>
  (sendPushToUser as jest.Mock).mock.calls.map(call => call[6]);

describe('GET /api/auto-debt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    queryLog = []
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(true)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'debts') return track('debts', { data: [], error: null });
      if (table === 'debt_payments') return track('debt_payments', { count: 0, error: null });
      return track(table);
    })
  })

  it('processes auto-deduct debts correctly', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()

    // 1st call: auto_deduct=true
    mockFrom.mockReturnValueOnce(track('debts', { data: [{
      id: 'd1', user_id: 'u1', name: 'Car Loan', monthly_payment: 200,
      remaining_amount: 1000, payment_day: fixedDay, auto_deduct: true, debt_type: 'payable'
    }] }))
    // 2nd call: auto_deduct=false
    mockFrom.mockReturnValueOnce(track('debts', { data: [] }))
    // Other calls (insert, update etc)
    mockFrom.mockReturnValue(track('other'))

    const req = new NextRequest('http://localhost/api/auto-debt')
    const res = await GET(req)
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.processed).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('تم خصم قسط Car Loan'),
      expect.stringContaining('المتبقي: 800'),
      '/dashboard/debts',
      'debt-auto',
      undefined,
      expect.stringContaining('debt-auto:u1:d1:')
    )
  })

  it('sends reminder for manual debts', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()

    // 1st call: auto_deduct=true (none)
    mockFrom.mockReturnValueOnce(track('debts', { data: [] }))
    // 2nd call: auto_deduct=false (one)
    mockFrom.mockReturnValueOnce(track('debts', { data: [{
      id: 'd2', user_id: 'u2', name: 'Family Loan', monthly_payment: 50,
      remaining_amount: 500, payment_day: fixedDay, auto_deduct: false
    }] }))
    // Other calls
    mockFrom.mockReturnValue(track('other'))

    const req = new NextRequest('http://localhost/api/auto-debt')
    const res = await GET(req)
    const json = await res.json()

    expect(json.processed).toBe(0)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u2',
      expect.stringContaining('Family Loan'),
      expect.stringContaining('50 JOD'),
      '/dashboard/debts',
      'debt-reminder',
      undefined,
      expect.stringContaining('debt-reminder:u2:d2:')
    )
  })

  it('gives every manual debt its own fingerprint so none are deduped away', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()
    const manual = (id: string, name: string, amount: number) => ({
      id, user_id: 'u1', name, monthly_payment: amount,
      remaining_amount: 500, payment_day: fixedDay, auto_deduct: false,
    })

    mockFrom.mockReturnValueOnce(track('debts', { data: [] }))
    mockFrom.mockReturnValueOnce(track('debts', { data: [manual('d1', 'Car Loan', 200), manual('d2', 'Family Loan', 50)] }))
    mockFrom.mockReturnValue(track('other'))

    const req = new NextRequest('http://localhost/api/auto-debt')
    await GET(req)

    // The default fingerprint is `${userId}:${tag}:${date}`, which is identical
    // for both debts. A per-debt fingerprint must therefore be passed instead.
    const sent = fingerprints()
    expect(sent).toHaveLength(2)
    expect(new Set(sent).size).toBe(2)
    expect(sent).toEqual(expect.arrayContaining([
      expect.stringContaining('debt-reminder:u1:d1:'),
      expect.stringContaining('debt-reminder:u1:d2:'),
    ]))
  })

  it('gives every auto-deducted debt its own fingerprint', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()
    const auto = (id: string, name: string, amount: number) => ({
      id, user_id: 'u1', name, monthly_payment: amount,
      remaining_amount: 500, payment_day: fixedDay, auto_deduct: true, debt_type: 'payable',
    })

    mockFrom.mockReturnValueOnce(track('debts', { data: [auto('d1', 'Car Loan', 200), auto('d2', 'Family Loan', 50)] }))
    mockFrom.mockReturnValueOnce(track('debts', { data: [] }))
    mockFrom.mockReturnValue(track('other'))

    const req = new NextRequest('http://localhost/api/auto-debt')
    await GET(req)

    const sent = fingerprints()
    expect(sent).toHaveLength(2)
    expect(new Set(sent).size).toBe(2)
    expect(sent).toEqual(expect.arrayContaining([
      expect.stringContaining('debt-auto:u1:d1:'),
      expect.stringContaining('debt-auto:u1:d2:'),
    ]))
  })
})
