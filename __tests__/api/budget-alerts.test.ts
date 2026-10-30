/**
 * @jest-environment node
 */
var mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (table: string) => mockFrom(table),
    auth: { getUser: jest.fn() }
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { GET } from '@/app/api/budget-alerts/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

// Robust chaining mock helper
const chain = (data: any = { data: [], error: null }) => {
  const obj: any = {
    then: (resolve: any) => resolve(data),
    catch: (reject: any) => reject(new Error('Mock chain error')),
  };
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single', 'rpc', 'is', 'in', 'match', 'textSearch'];
  methods.forEach(m => {
    obj[m] = jest.fn(() => chain(data));
  });
  return obj;
};

var spentAmount = 0
var budgetLimit = 100
var budgetRows: any[] = []
var txRows: any[] = []

const currentMonthBudget = (overrides: Record<string, unknown> = {}) => ({
  id: 'b1',
  user_id: 'u1',
  category: 'Food',
  monthly_limit: budgetLimit,
  ...overrides,
})

const currentMonthTx = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'u1',
  category: 'Food',
  amount: spentAmount,
  ...overrides,
})

describe('GET /api/budget-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    budgetLimit = 100
    spentAmount = 0
    budgetRows = [currentMonthBudget()]
    txRows = [currentMonthTx()]
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(true) // Reset to true by default

    mockFrom.mockImplementation((table: string) => {
      if (table === 'budgets') {
        return chain({ data: budgetRows, error: null });
      }
      if (table === 'transactions') {
        return chain({ data: txRows, error: null });
      }
      return chain();
    });
  })

  it('returns 401 if cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(false)

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('checks budgets and sends alerts when limit is exceeded', async () => {
    spentAmount = 110 // Above 100 limit
    txRows = [currentMonthTx()]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.alerted).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('تجاوزت ميزانية Food'),
      expect.stringContaining('أنفقت 110'),
      '/dashboard/budgets',
      'warning',
      undefined,
      expect.stringContaining('budget_100_b1')
    )
  })

  it('sends warning alert when 80% limit reached', async () => {
    spentAmount = 85 // 85% of 100 limit
    txRows = [currentMonthTx()]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.alerted).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('وصلت 85%'),
      expect.stringContaining('تبقى 15'),
      '/dashboard/budgets',
      'budget',
      undefined,
      expect.stringContaining('budget_80_b1')
    )
  })

  it('does NOT alert when monthly_limit is zero (zero-budget guard)', async () => {
    budgetLimit = 0
    spentAmount = 500 // any spend at all would previously trip "limit exceeded"
    budgetRows = [currentMonthBudget()]
    txRows = [currentMonthTx()]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.alerted).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  // ── N+1 regression: one spending query for all budgets ─────────────────────
  it('issues exactly one transactions query no matter how many budgets exist', async () => {
    budgetRows = [
      currentMonthBudget({ id: 'b1', user_id: 'u1', category: 'Food' }),
      currentMonthBudget({ id: 'b2', user_id: 'u2', category: 'Food' }),
      currentMonthBudget({ id: 'b3', user_id: 'u3', category: 'Transport' }),
    ]
    txRows = [
      { user_id: 'u1', category: 'Food', amount: 90 },
      { user_id: 'u2', category: 'Food', amount: 120 },
      { user_id: 'u3', category: 'Transport', amount: 10 },
    ]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    const transactionCalls = mockFrom.mock.calls.filter(([table]: [string]) => table === 'transactions')
    expect(transactionCalls).toHaveLength(1)

    expect(json.checked).toBe(3)
    expect(json.alerted).toBe(2) // u1 at 90% (warning), u2 at 120% (exceeded)
  })

  it('sums only the rows belonging to each budget bucket', async () => {
    budgetRows = [
      currentMonthBudget({ id: 'b1', user_id: 'u1', category: 'Food' }),
      currentMonthBudget({ id: 'b2', user_id: 'u1', category: 'Transport' }),
    ]
    txRows = [
      { user_id: 'u1', category: 'Food', amount: 90 },
      { user_id: 'u1', category: 'Food', amount: 5 },
      { user_id: 'u1', category: 'Transport', amount: 5 },
      // Another user's Food spending must not leak into u1's bucket.
      { user_id: 'u2', category: 'Food', amount: 500 },
    ]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.alerted).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('وصلت 95%'),
      expect.stringContaining('تبقى 5'),
      '/dashboard/budgets',
      'budget',
      undefined,
      expect.stringContaining('budget_80_b1')
    )
  })

  it('counts every budget in `checked` but skips zero-limit ones', async () => {
    budgetRows = [
      currentMonthBudget({ id: 'b1', monthly_limit: 100 }),
      currentMonthBudget({ id: 'b2', monthly_limit: 0 }),
    ]
    txRows = [{ user_id: 'u1', category: 'Food', amount: 110 }]

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.checked).toBe(2)
    expect(json.alerted).toBe(1)
  })

  it('keeps alerting the other users when one push throws', async () => {
    const { sendPushToUser: mockPush } = require('@/lib/push-send')
    mockPush
      .mockRejectedValueOnce(new Error('fcm down'))
      .mockResolvedValueOnce(1)

    budgetRows = [
      currentMonthBudget({ id: 'b1', user_id: 'u1', category: 'Food' }),
      currentMonthBudget({ id: 'b2', user_id: 'u2', category: 'Food' }),
    ]
    txRows = [
      { user_id: 'u1', category: 'Food', amount: 120 },
      { user_id: 'u2', category: 'Food', amount: 120 },
    ]
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    const json = await res.json()

    expect(json.alerted).toBe(1)
    expect(mockPush).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })

  it('returns 500 when the transactions query fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFrom.mockImplementation((table: string) => {
      if (table === 'budgets') return chain({ data: budgetRows, error: null })
      if (table === 'transactions') return chain({ data: null, error: { message: 'db down' } })
      return chain()
    })

    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)

    expect(res.status).toBe(500)
    expect(sendPushToUser).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
