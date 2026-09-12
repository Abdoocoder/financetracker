/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

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

function makeGetRequest(url = 'http://localhost/api/testimonials?user_id=u1', token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest(url, { headers })
}

function setupMock({
  profiles = [] as any[],
  transactions = [] as any[],
  debts = [] as any[],
  investments = [] as any[],
  goals = [] as any[],
  stats = { badges: [], total_points: 0 },
  alerts = [] as any[],
  testimonials = [] as any[],
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
    if (table === 'testimonials') return chain({ data: testimonials, error: null })
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
    'order', 'limit',
    'is', 'in', 'match', 'textSearch', 'head',
  ]
  methods.forEach(m => { obj[m] = () => chain(data) })
  const single = () => {
    const rows = data.data ?? []
    const row = Array.isArray(rows) ? rows[0] : rows
    return Promise.resolve({ data: row ?? null, error: null })
  }
  obj.single = single
  obj.maybeSingle = single
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
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
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
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[],
      testimonials: [] as any[],
    })
    const req = makePostRequest({ name: 'أحمد علي', text: 'This is a great app that helped me track my expenses', stars: 5 }, 'valid-token')
    const res = await POST(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.updated).toBe(false)
  })

  it('updates existing testimonial when user already has one', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[],
      testimonials: [{ id: 't1', user_id: 'u1' }] as any[],
    })
    const req = makePostRequest({ name: 'أحمد علي', text: 'Updated with a longer review text that meets the limit', stars: 5 }, 'valid-token')
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
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[],
      testimonials: [{ id: 't1', user_id: 'u1', is_visible: false }] as any[],
    })
    const req = makeGetRequest('http://localhost/api/testimonials?user_id=u1', 'valid-token')
    const res = await GET(req)
    const json = await res.json()
    expect(json).not.toBeNull()
  })

  it('returns public visible testimonials', async () => {
    setupMock({
      profiles: [{ id: 'u1', full_name: 'أحمد علي' }],
      testimonials: [{ id: 't1', user_id: 'u1', is_visible: true }],
    })
    const req = makeGetRequest('http://localhost/api/testimonials?user_id=u1&is_visible=true')
    const res = await GET(req)
    const json = await res.json()
    expect(json).not.toBeNull()
  })
})