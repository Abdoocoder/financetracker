/**
 * @jest-environment node
 */
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

import { GET, POST } from '@/app/api/alerts/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

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

const mockProfile = {
  id: 'u1',
  monthly_income: 1000,
  full_name: 'أحمد علي',
}

function setupMock({
  profiles = [mockProfile],
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
      // pre-fetch returns user_id+title rows; alertsCount > 0 means all titles already exist
      const alertData = alertsCount > 0 ? [
        { user_id: 'u1', title: '🚨 تجاوزت 90% من دخلك!' },
        { user_id: 'u1', title: '⚠️ مصاريفك تجاوزت 75% من دخلك' },
        { user_id: 'u1', title: '🏆 ادخرت أكثر من 50% من دخلك!' },
        { user_id: 'u1', title: '⏰ لم تسجل أي معاملات هذا الأسبوع' },
        { user_id: 'u1', title: '⏰ No transactions recorded this week' },
        { user_id: 'u1', title: '💪 خطوة صغيرة تصنع فارقاً كبيراً' },
        { user_id: 'u1', title: '🌟 الانضباط المالي عادة لا موهبة' },
        { user_id: 'u1', title: '📊 راجع ميزانيتك الأسبوع القادم' },
        { user_id: 'u1', title: '🏦 الادخار أولاً قبل الإنفاق' },
        { user_id: 'u1', title: '⚡ أنت على الطريق الصحيح يا أحمد' },
        { user_id: 'u1', title: '🎯 هدف واحد كل شهر يغير حياتك' },
        { user_id: 'u1', title: '💡 المعرفة المالية هي أفضل استثمار' },
      ] : []
      return chain({ data: alertData, count: alertsCount, error: null })
    }
    return chain()
  })
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/alerts')
}

function makePostRequest(token: string) {
  return new NextRequest('http://localhost/api/alerts', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
}

/** Check that sendPushToUser was called with content containing `text` anywhere in its args.
 *  Works for both single-alert calls and batched multi-alert calls. */
function expectPushContaining(text: string) {
  const calls = (sendPushToUser as jest.Mock).mock.calls
  const allContent = calls.map(c => c.join(' ')).join(' ')
  expect(allContent).toContain(text)
}

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/alerts — auth', () => {
  it('returns 401 when cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with generated=0 when no profiles exist', async () => {
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.generated).toBe(0)
  })
})

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/alerts — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/alerts', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('bad token') })
    const res = await POST(makePostRequest('bad-token'))
    expect(res.status).toBe(401)
  })

  it('returns ok:true with generated count for valid token', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })
    setupMock({ profiles: [mockProfile], alertsCount: 1 }) // all alerts already exist
    const res = await POST(makePostRequest('valid-token'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(typeof json.generated).toBe('number')
  })
})

// ─── Alert generation ─────────────────────────────────────────────────────────

describe('generateAlerts — expense ratio > 90%', () => {
  it('sends 🚨 warning when expenses > 90% of income', async () => {
    setupMock({
      transactions: [
        { type: 'income',  amount: 1000, transaction_date: '2026-04-01' },
        { type: 'expense', amount: 950,  transaction_date: '2026-04-02' }, // 95%
      ],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('90%')
  })
})

describe('generateAlerts — expense ratio > 75%', () => {
  it('sends ⚠️ warning when expenses between 75–90% of income', async () => {
    setupMock({
      transactions: [
        { type: 'income',  amount: 1000, transaction_date: '2026-04-01' },
        { type: 'expense', amount: 800,  transaction_date: '2026-04-02' }, // 80%
      ],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('75%')
  })
})

describe('generateAlerts — savings achievement < 50%', () => {
  it('sends 🏆 achievement when expenses < 50% of income', async () => {
    setupMock({
      transactions: [
        { type: 'income',  amount: 1000, transaction_date: '2026-04-01' },
        { type: 'expense', amount: 400,  transaction_date: '2026-04-02' }, // 40%
      ],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('50%')
  })
})

describe('generateAlerts — debt nearly paid', () => {
  it('sends 🎯 achievement when debt is 80%+ paid', async () => {
    setupMock({
      debts: [{
        name: 'قرض السيارة',
        remaining_amount: 200,
        original_amount: 1000,  // 80% paid
        monthly_payment: 100,
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('قرض السيارة')
  })
})

describe('generateAlerts — high debt', () => {
  it('sends 💳 warning when total debt > 6x income', async () => {
    setupMock({
      transactions: [
        { type: 'income', amount: 1000, transaction_date: '2026-04-01' },
      ],
      debts: [{
        name: 'دين كبير',
        remaining_amount: 7000,  // >6x income (1000)
        original_amount: 8000,
        monthly_payment: 200,
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('6')
  })
})

describe('generateAlerts — investment gain', () => {
  it('sends 📈 achievement when portfolio is in the green', async () => {
    setupMock({
      investments: [{
        symbol: 'SPUS',
        shares: 10,
        current_price: 120,  // value: 1200
        avg_buy_price: 100,  // cost: 1000 → PnL: +200
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('📈')
  })
})

describe('generateAlerts — investment loss > 10%', () => {
  it('sends 📉 reminder when portfolio is down more than 10%', async () => {
    setupMock({
      investments: [{
        symbol: 'SPUS',
        shares: 10,
        current_price: 85,   // value: 850
        avg_buy_price: 100,  // cost: 1000 → PnL: -150 (15% loss)
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('📉')
  })
})

describe('generateAlerts — savings goal almost reached', () => {
  it('sends 🎯 achievement when goal is 90%+ complete', async () => {
    setupMock({
      goals: [{
        name: 'سيارة',
        current_amount: 9500,
        target_amount: 10000,  // 95%
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('سيارة')
  })
})

describe('generateAlerts — stagnant goal', () => {
  it('sends ⏰ reminder when goal has 0 current amount', async () => {
    setupMock({
      goals: [{
        name: 'رحلة',
        current_amount: 0,
        target_amount: 5000,
      }],
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    expect(sendPushToUser).toHaveBeenCalled()
    expectPushContaining('رحلة')
  })
})

describe('generateAlerts — duplicate prevention', () => {
  it('does not send alert when alreadyExists returns count > 0', async () => {
    setupMock({
      transactions: [
        { type: 'income',  amount: 1000, transaction_date: '2026-04-01' },
        { type: 'expense', amount: 950,  transaction_date: '2026-04-02' },
      ],
      alertsCount: 1, // alert already sent recently
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    // sendPushToUser should not be called (all alerts exist already)
    expect(sendPushToUser).not.toHaveBeenCalled()
    expect(json.generated).toBe(0)
  })
})

describe('generateAlerts — motivation fallback', () => {
  it('always sends a motivation message when no other alerts triggered', async () => {
    setupMock({
      // No transactions, debts, investments, goals → only motivation fires
      alertsCount: 0,
    })
    await GET(makeGetRequest())
    // At least one push sent (motivation)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
  })
})
