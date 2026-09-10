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

import { POST, GET } from '@/app/api/testimonials/route'
import { NextRequest } from 'next/server'

function makePostRequest(body: any, token: string = 'valid-token') {
  return new NextRequest('http://localhost/api/testimonials', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(url = 'http://localhost/api/testimonials?user_id=u1') {
  return new NextRequest(url)
}

function setupMock({
  profiles = [],
  transactions = [],
  debts = [],
  investments = [],
  goals = [],
  stats = { badges: [], total_points: 0 },
  alerts = [],
} = {}) {
  mockFrom.mockClear()
  mockGetUser.mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'transactions') return chain({ data: transactions, error: null })
    if (table === 'debts') return chain({ data: debts, error: null })
    if (table === 'investments') return chain({ data: investments, error: null })
    if (table === 'savings_goals') return chain({ data: goals, error: null })
    if (table === 'user_stats') return chain({ data: stats, error: null })
    if (table === 'alerts') return chain({ data: alerts, error: null })
    return chain()
  })
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

describe('POST /api/testimonials', () => {
  it('returns 401 without Authorization header', async () => {
    const req = new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const req = new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify({ name: 'Test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when text < 20 chars', async () => {
    const req = new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
      body: JSON.stringify({ name: 'Test', text: 'short', stars: 5 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates new testimonial when none exists', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }],
      alerts: [],
    })
    const req = makePostRequest({ name: 'أحمد علي', text: 'great app', stars: 5 }, 'valid-token')
    const res = await POST(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.updated).toBe(false)
  })

  it('updates existing testimonial when user already has one', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }],
      alerts: [{ user_id: 'u1', title: 'old' }],
    })
    const req = makePostRequest({ name: 'أحمد علي', text: 'updated', stars: 5 }, 'valid-token')
    const res = await POST(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.updated).toBe(true)
  })
})

describe('GET /api/testimonials', () => {
  it('returns null when no user_id param', async () => {
    const req = makeGetRequest('http://localhost/api/testimonials')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toBeNull()
  })

  it('returns own testimonial even if not visible (authenticated user)', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }],
      transactions: [],
      alerts: [],
    })
    const req = makeGetRequest('http://localhost/api/testimonials?user_id=u1')
    const res = await GET(req)
    const json = await res.json()
    expect(json).not.toBeNull()
  })

  it('returns public visible testimonials', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }],
      alerts: [],
    })
    const req = makeGetRequest('http://localhost/api/testimonials?user_id=u1&is_visible=true')
    const res = await GET(req)
    const json = await res.json()
    expect(json).not.toBeNull()
  })
})