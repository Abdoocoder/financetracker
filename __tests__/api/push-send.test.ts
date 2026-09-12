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

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue({ ok: true, headers: {} }),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { POST } from '@/app/api/push-send/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makePostRequest(body: any, cronAuth = true) {
  const headers: HeadersInit = {
    authorization: cronAuth ? 'Bearer cron-secret' : '',
  }
  return new NextRequest('http://localhost/api/push-send', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function setupMock({
  userId = 'u1',
  title = 'Test Title',
  message = 'Test Message',
} = {}) {
  mockFrom.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: [{ id: userId }], error: null })
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

describe('POST /api/push-send', () => {
  it('returns 401 when verifyCronAuth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock()
    const req = makePostRequest({ userId: 'u1', title: 'T', message: 'M' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    const rateLimit = jest.requireMock('@/lib/rate-limit')
    rateLimit.rateLimit.mockReturnValueOnce({ ok: false, headers: {} })
    setupMock()
    const req = makePostRequest({ userId: 'u1', title: 'T', message: 'M' })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('calls sendPushToUser with correct params', async () => {
    setupMock()
    const req = makePostRequest({ userId: 'u1', title: 'Test Title', message: 'Test Message' })
    const res = await POST(req)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      'Test Title',
      'Test Message'
    )
  })
})