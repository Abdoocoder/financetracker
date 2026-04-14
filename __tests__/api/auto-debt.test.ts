/**
 * @jest-environment node
 */
var mockFrom = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
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

// Robust chaining mock helper
const chain = (data: any = { data: [], error: null }) => {
  const obj: any = {
    then: (resolve: any) => resolve(data),
    catch: (reject: any) => reject(new Error('Mock chain error')),
  };
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'single', 'rpc', 'is', 'in', 'match'];
  methods.forEach(m => {
    obj[m] = () => chain(data);
  });
  return obj;
};

describe('GET /api/auto-debt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(true)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'debts') {
        return chain({ data: debtsList, error: null });
      }
      if (table === 'debt_payments') {
        return chain({ count: 0, error: null });
      }
      return chain();
    });
  })

  var debtsList: any[] = []

  it('processes auto-deduct debts correctly', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()
    
    // Override mockFrom for this test
    // 1st call: auto_deduct=true
    mockFrom.mockReturnValueOnce(chain({ data: [{ 
      id: 'd1', user_id: 'u1', name: 'Car Loan', monthly_payment: 200, 
      remaining_amount: 1000, payment_day: fixedDay, auto_deduct: true
    }] }))
    // 2nd call: auto_deduct=false
    mockFrom.mockReturnValueOnce(chain({ data: [] }))
    // Other calls (insert, update etc)
    mockFrom.mockReturnValue(chain())

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
      'debt-auto'
    )
  })

  it('sends reminder for manual debts', async () => {
    const fixedDay = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).getUTCDate()

    // 1st call: auto_deduct=true (none)
    mockFrom.mockReturnValueOnce(chain({ data: [] }))
    // 2nd call: auto_deduct=false (one)
    mockFrom.mockReturnValueOnce(chain({ data: [{ 
      id: 'd2', user_id: 'u2', name: 'Family Loan', monthly_payment: 50, 
      remaining_amount: 500, payment_day: fixedDay, auto_deduct: false
    }] }))
    // Other calls
    mockFrom.mockReturnValue(chain())

    const req = new NextRequest('http://localhost/api/auto-debt')
    const res = await GET(req)
    const json = await res.json()

    expect(json.processed).toBe(0) 
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u2',
      expect.stringContaining('Family Loan'),
      expect.stringContaining('50 JOD'),
      '/dashboard/debts',
      'debt-reminder'
    )
  })
})
