/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockRpc = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    rpc: (fn: string, params: unknown) => mockRpc(fn, params),
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { GET } from '@/app/api/zakat-reminder/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makeGetRequest(url = 'http://localhost/api/zakat-reminder') {
  return new NextRequest(url)
}

function setupMock({
  profiles = [] as any[],
  hauls = [] as any[],
} = {}) {
  mockFrom.mockClear()
  mockRpc.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    return chain()
  })
  mockRpc.mockImplementation((fn: string) => {
    if (fn === 'get_zakat_hauls') return Promise.resolve({ data: hauls, error: null })
    return Promise.resolve({ data: null, error: null })
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

const profiles = [{ id: 'u1', full_name: 'أحمد علي' }] as any[]

describe('GET /api/zakat-reminder', () => {
  it('returns 401 when cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with sent=0 when no profiles', async () => {
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.sent).toBe(0)
  })

  it('uses get_zakat_hauls RPC per user instead of inline math', async () => {
    setupMock({ profiles, hauls: [] })
    await GET(makeGetRequest())
    expect(mockRpc).toHaveBeenCalledWith('get_zakat_hauls', { p_user_id: 'u1' })
  })

  it('sends a reminder when days_remaining is 30', async () => {
    setupMock({
      profiles,
      hauls: [
        { source: 'investment', label: 'GOOLD', value_usd: 500, days_remaining: 30 },
      ],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('شهر'),
      expect.any(String),
      '/dashboard/zakat',
      'zakat-due',
    )
  })

  it('sends a reminder when days_remaining is 7', async () => {
    setupMock({
      profiles,
      hauls: [
        { source: 'investment', label: 'ذهب', value_usd: 1000, days_remaining: 7 },
      ],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('7'),
      expect.any(String),
      '/dashboard/zakat',
      'zakat-due',
    )
  })

  it('sends a due reminder on the haul day (days_remaining 0) using the RPC label', async () => {
    setupMock({
      profiles,
      hauls: [
        { source: 'holding', label: 'gold', asset_type: 'gold', grams: 10, value_usd: null, days_remaining: 0 },
      ],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledWith(
      'u1',
      expect.stringContaining('gold'),
      expect.stringContaining('الزكاة المستحقة'),
      '/dashboard/zakat',
      'zakat-due',
    )
  })

  it('does NOT send when days_remaining is outside the notification window', async () => {
    setupMock({
      profiles,
      hauls: [
        { source: 'investment', label: 'GOOLD', value_usd: 500, days_remaining: 100 },
        { source: 'investment', label: 'AAPL', value_usd: 200, days_remaining: 20 },
      ],
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })
})
