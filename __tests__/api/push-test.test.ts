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

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ ok: true, headers: {} }),
}))

import { POST } from '@/app/api/push-test/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

process.env.CRON_SECRET = 'test-cron-secret'

function makePostRequest(body?: any, auth?: string, userId?: string) {
  const headers: HeadersInit = {}
  if (auth) Object.assign(headers, { authorization: auth })
  const bodyInit = body ? JSON.stringify(body) : undefined
  return new NextRequest('http://localhost/api/push-test', {
    method: 'POST',
    headers,
    body: bodyInit,
  })
}

function setupMock({
  explicitUserId,
}: { explicitUserId?: string } = {}) {
  mockFrom.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: [{ id: explicitUserId || 'u1' }], error: null })
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

describe('POST /api/push-test', () => {
  it('returns 401 without Authorization header', async () => {
    const req = makePostRequest()
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    const rateLimit = jest.requireMock('@/lib/rate-limit')
    rateLimit.rateLimit.mockReturnValueOnce({ ok: false, headers: {} })
    const req = makePostRequest()
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('accepts CRON_SECRET token with user_id in body', async () => {
    const req = makePostRequest(
      { user_id: 'u1' },
      'Bearer test-cron-secret'
    )
    const res = await POST(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(1)
  })

  it('accepts valid user token', async () => {
    const req = makePostRequest(
      { user_id: 'u1' },
      'Bearer valid-user-token'
    )
    const res = await POST(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 400 when cron path used without user_id', async () => {
    const req = makePostRequest({}, 'Bearer test-cron-secret')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})