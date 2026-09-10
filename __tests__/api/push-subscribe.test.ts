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

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ ok: true, headers: {} }),
}))

import { POST, DELETE } from '@/app/api/push-subscribe/route'
import { NextRequest } from 'next/server'

function makePostRequest(body: any, auth: string = 'Bearer token') {
  return new NextRequest('http://localhost/api/push-subscribe', {
    method: 'POST',
    headers: { authorization: auth },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(body: any, auth: string = 'Bearer token') {
  return new NextRequest('http://localhost/api/push-subscribe', {
    method: 'DELETE',
    headers: { authorization: auth },
    body: JSON.stringify(body),
  })
}

function setupMock({
  profiles = [],
  users = [],
} = {}) {
  mockFrom.mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'users') return chain({ data: users, error: null })
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

describe('POST /api/push-subscribe', () => {
  it('returns 401 without Authorization header', async () => {
    const req = makePostRequest({})
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const req = makePostRequest({}, 'Bearer invalid')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('stores FCM subscription when type=fcm', async () => {
    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }], users: [{ id: 'u1' }] })
    const req = makePostRequest({ fcmToken: 'token123', type: 'fcm' })
    const res = await POST(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.type).toBe('fcm')
  })

  it('stores web push subscription', async () => {
    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }], users: [{ id: 'u1' }] })
    const req = makePostRequest({
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'dhkey', auth: 'authkey' },
    })
    const res = await POST(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.type).toBe('webpush')
  })

  it('returns 400 when missing endpoint/keys', async () => {
    const req = makePostRequest({ endpoint: '', keys: {} })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/push-subscribe', () => {
  it('returns 401 without Authorization header', async () => {
    const req = makeDeleteRequest({})
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('deletes subscription successfully', async () => {
    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }], users: [{ id: 'u1' }] })
    const req = makeDeleteRequest({ endpoint: 'test-endpoint' })
    const res = await DELETE(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 429 when rate limited', async () => {
    const rateLimit = jest.requireMock('@/lib/rate-limit')
    rateLimit.rateLimit.mockReturnValueOnce({ ok: false, headers: {} })
    const req = makeDeleteRequest({ endpoint: 'test' }, 'Bearer token')
    const res = await DELETE(req)
    expect(res.status).toBe(429)
  })
})