/**
 * @jest-environment node
 */
process.env.CRON_SECRET = 'test-secret'

// Use var for hoisting
var mockFrom = jest.fn()
var mockGetUser = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/unified-tools', () => ({
  getBudgets: jest.fn(),
  getDebts: jest.fn(),
  getCashflowSummary: jest.fn(),
}))

import { GET } from '@/app/api/agent/proactive/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'
import * as unifiedTools from '@/lib/unified-tools'

const getBudgetsMock = unifiedTools.getBudgets as jest.Mock
const getDebtsMock = unifiedTools.getDebts as jest.Mock
const getCashflowSummaryMock = unifiedTools.getCashflowSummary as jest.Mock

function makeGetRequest(url = 'http://localhost/api/agent/proactive') {
  return new NextRequest(url)
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
    'is', 'in', 'match', 'textSearch', 'head',
  ]
  methods.forEach(m => { obj[m] = () => chain(data) })
  return obj
}

describe('GET /api/agent/proactive', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getBudgetsMock.mockReset()
    getDebtsMock.mockReset()
    getCashflowSummaryMock.mockReset()
    ;(sendPushToUser as jest.Mock).mockClear()

    // Default: no duplicates in notification_history
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain({ data: [{ id: 'u1', full_name: 'أحمد علي', currency: 'JOD', lang: 'ar' }], error: null })
      if (table === 'notification_history') {
        return {
          ...chain({ data: [], error: null }),
          select: () => ({
            ...chain({ data: [], error: null }),
            eq: () => Promise.resolve({ data: null, error: null, count: 0 })
          })
        }
      }
      return chain()
    })
  })

  it('returns 401 when verifyCronAuth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok with processed count when no profiles', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain({ data: [], error: null })
      return chain()
    })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.processed).toBe(0)
    expect(json.insights).toBe(0)
  })

  it('generates budget insight when budget > 90% used', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 190,
      remaining: 10,
      percentage: 95,
    }])
    getDebtsMock.mockResolvedValue([])
    getCashflowSummaryMock.mockResolvedValue({ ok: true, expense: 500, income: 1000, net: 500, transaction_count: 10 })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.insights).toBeGreaterThanOrEqual(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('ميزانية Food'),
      expect.stringContaining('95%'),
      '/dashboard/budgets',
      'warning',
      undefined,
      expect.stringContaining('proactive_budget')
    )
  })

  it('generates debt insight when debt due within 3 days', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 100,
      remaining: 100,
      percentage: 50,
    }])

    // Use a date that's clearly tomorrow at a future time to avoid edge cases
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000) // tomorrow + 1 hour
    const dueDate = tomorrow.toISOString().split('T')[0]

    getDebtsMock.mockResolvedValue([{
      id: 'd1',
      name: 'Car Loan',
      monthly_payment: 150,
      next_due_date: dueDate,
      is_paid: false,
      debt_type: 'owed',
      total_amount: 5000,
      remaining_balance: 2000,
      end_date: null,
      priority: 1,
    }])
    getCashflowSummaryMock.mockResolvedValue({ ok: true, expense: 500, income: 1000, net: 500, transaction_count: 10 })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.insights).toBeGreaterThanOrEqual(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('Car Loan'),
      expect.stringContaining(dueDate),
      '/dashboard/debts',
      'debt-reminder',
      undefined,
      expect.stringContaining('proactive_debt')
    )
  })

  it('generates spending insight when spending up >20% vs last month', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 100,
      remaining: 100,
      percentage: 50,
    }])
    getDebtsMock.mockResolvedValue([])

    // This month: 600, Last month: 400 = 50% increase
    let cashflowCallCount = 0
    getCashflowSummaryMock.mockImplementation(async () => {
      cashflowCallCount++
      if (cashflowCallCount === 1) {
        return { ok: true, expense: 600, income: 1000, net: 400, transaction_count: 12 } // this month
      }
      return { ok: true, expense: 400, income: 1000, net: 600, transaction_count: 10 } // last month
    })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.insights).toBeGreaterThanOrEqual(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('ارتفع'),
      expect.stringContaining('600'),
      '/dashboard?tab=spending',
      'finance-alert',
      undefined,
      expect.stringContaining('proactive_spending')
    )
  })

  it('does NOT generate spending insight when increase is <= 20%', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 100,
      remaining: 100,
      percentage: 50,
    }])
    getDebtsMock.mockResolvedValue([])

    // This month: 450, Last month: 400 = 12.5% increase (under 20% threshold)
    let cashflowCallCount2 = 0
    getCashflowSummaryMock.mockImplementation(async () => {
      cashflowCallCount2++
      if (cashflowCallCount2 === 1) {
        return { ok: true, expense: 450, income: 1000, net: 550, transaction_count: 12 }
      }
      return { ok: true, expense: 400, income: 1000, net: 600, transaction_count: 10 }
    })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    // Should not generate spending insight
    const spendingCalls = (sendPushToUser as jest.Mock).mock.calls.filter(
      (call: any) => call[4] === 'finance-alert' && call[6]?.includes('proactive_spending')
    )
    expect(spendingCalls.length).toBe(0)
  })

  it('does NOT generate duplicate budget insight (same fingerprint)', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 190,
      remaining: 10,
      percentage: 95,
    }])
    getDebtsMock.mockResolvedValue([])
    getCashflowSummaryMock.mockResolvedValue({ ok: true, expense: 500, income: 1000, net: 500, transaction_count: 10 })

    // Simulate notification_history already having this fingerprint
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain({ data: [{ id: 'u1', full_name: 'أحمد علي', currency: 'JOD', lang: 'ar' }], error: null })
      if (table === 'notification_history') {
        callCount++
        if (callCount === 1) {
          // First call (budget check) - return 1 (exists)
          return {
            ...chain({ data: [], error: null }),
            select: () => ({
              ...chain({ data: [], error: null }),
              eq: () => Promise.resolve({ data: null, error: null, count: 1 })
            })
          }
        }
        return {
          ...chain({ data: [], error: null }),
          select: () => ({
            ...chain({ data: [], error: null }),
            eq: () => Promise.resolve({ data: null, error: null, count: 0 })
          })
        }
      }
      return chain()
    })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    // Should not send push notification for budget since fingerprint exists
    const budgetCalls = (sendPushToUser as jest.Mock).mock.calls.filter(
      (call: any) => call[4] === 'warning' && call[6]?.includes('proactive_budget')
    )
    expect(budgetCalls.length).toBe(0)
  })

  it('skips receivable debts (only owed debts)', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 100,
      remaining: 100,
      percentage: 50,
    }])

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    getDebtsMock.mockResolvedValue([{
      id: 'd1',
      name: 'Money owed to me',
      monthly_payment: 150,
      next_due_date: dueDate,
      is_paid: false,
      debt_type: 'receivable', // This should be skipped
      total_amount: 5000,
      remaining_balance: 2000,
      end_date: null,
      priority: 1,
    }])
    getCashflowSummaryMock.mockResolvedValue({ ok: true, expense: 500, income: 1000, net: 500, transaction_count: 10 })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    // Should not generate debt insight for receivable
    const debtCalls = (sendPushToUser as jest.Mock).mock.calls.filter(
      (call: any) => call[4] === 'debt-reminder'
    )
    expect(debtCalls.length).toBe(0)
  })

  it('skips already paid debts', async () => {
    getBudgetsMock.mockResolvedValue([{
      category: 'Food',
      monthly_limit: 200,
      spent: 100,
      remaining: 100,
      percentage: 50,
    }])

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dueDate = tomorrow.toISOString().split('T')[0]

    getDebtsMock.mockResolvedValue([{
      id: 'd1',
      name: 'Paid Loan',
      monthly_payment: 150,
      next_due_date: dueDate,
      is_paid: true, // Already paid
      debt_type: 'owed',
      total_amount: 5000,
      remaining_balance: 0,
      end_date: null,
      priority: 1,
    }])
    getCashflowSummaryMock.mockResolvedValue({ ok: true, expense: 500, income: 1000, net: 500, transaction_count: 10 })

    const res = await GET(makeGetRequest())
    const json = await res.json()

    const debtCalls = (sendPushToUser as jest.Mock).mock.calls.filter(
      (call: any) => call[4] === 'debt-reminder'
    )
    expect(debtCalls.length).toBe(0)
  })
})