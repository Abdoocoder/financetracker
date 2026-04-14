/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockSelect = jest.fn()
var mockEq = jest.fn()
var mockGte = jest.fn()
var mockLte = jest.fn()

// Define a central mock client that route files will pick up
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
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
    obj[m] = () => chain(data);
  });
  return obj;
};

describe('GET /api/budget-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(true) // Reset to true by default
    
    mockFrom.mockImplementation((table: string) => {
      if (table === 'budgets') {
        return chain({ data: [{ id: 'b1', user_id: 'u1', category: 'Food', monthly_limit: 100 }], error: null });
      }
      if (table === 'transactions') {
        return chain({ data: [{ amount: spentAmount }], error: null });
      }
      return chain();
    });
  })

  var spentAmount = 0

  it('returns 401 if cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValue(false)
    
    const req = new NextRequest('http://localhost/api/budget-alerts')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('checks budgets and sends alerts when limit is exceeded', async () => {
    spentAmount = 110 // Above 100 limit

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
})
