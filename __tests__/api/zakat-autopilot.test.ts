/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockRpc = jest.fn()
var updateCalls: any[] = []

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    rpc: (fn: string, args: any) => mockRpc(fn, args),
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { GET } from '@/app/api/zakat-autopilot/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

function makeGetRequest(url = 'http://localhost/api/zakat-autopilot') {
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

// صيغة JSON التي يعيدها RPC sync_zakat_haul_state
function haulState(overrides: any = {}) {
  return {
    user_id: USER_A,
    nisab_reached_at: '2026-01-01T00:00:00.000000+00:00',
    current_haul_due_at: '2026-12-20T00:00:00.000000+00:00',
    last_notified_at: null,
    days_remaining: 300,
    is_eligible: true,
    zakatable_assets: 5100,
    nisab_effective: 208.25,
    zakat_due: 127.5,
    ...overrides,
  }
}

function setupMock({
  profiles = [] as any[],
  states = {} as Record<string, any>,
  rpcError = null as any,
} = {}) {
  mockFrom.mockClear()
  mockRpc.mockClear()
  updateCalls = []
  ;(sendPushToUser as jest.Mock).mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'zakat_haul_tracking') {
      return {
        update: (payload: any) => {
          updateCalls.push(payload)
          return chain({ data: null, error: null })
        },
      }
    }
    return chain()
  })

  // لكل مستخدم حالة RPC مختلفة؛ rpcError يُرجع خطأً لجميع المستخدمين
  mockRpc.mockImplementation((_fn: string, args: any) => {
    if (rpcError) return Promise.resolve({ data: null, error: rpcError })
    const state = states[args.p_user_id]
    if (!state) return Promise.resolve({ data: null, error: { message: 'no state' } })
    return Promise.resolve({ data: state, error: null })
  })
}

describe('GET /api/zakat-autopilot', () => {
  it('returns 401 when cron auth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with synced=0 notified=0 when no profiles', async () => {
    setupMock({ profiles: [] })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.synced).toBe(0)
    expect(json.notified).toBe(0)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('syncs state via the RPC and sends a push when within the 7-day window', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد علي' }],
      states: { [USER_A]: haulState({ days_remaining: 5, last_notified_at: null }) },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.synced).toBe(1)
    expect(json.notified).toBe(1)
    expect(mockRpc).toHaveBeenCalledWith('sync_zakat_haul_state', { p_user_id: USER_A })
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    const [uid, title, body, url, tag] = (sendPushToUser as jest.Mock).mock.calls[0]
    expect(uid).toBe(USER_A)
    expect(title).toBe('اقترب حول زكاتك 🌙')
    expect(body).toContain('5')
    expect(body).toContain('128') // 127.5 مستديم لأقرب رقم
    expect(url).toBe('/dashboard/zakat')
    expect(tag).toBe('zakat-due')
    // ختم مانع الإزعاج يُكتب في جدول التتبع
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].last_notified_at).toBeTruthy()
  })

  it('treats overdue/today (days_remaining <= 0) as inside the window', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد' }],
      states: { [USER_A]: haulState({ days_remaining: 0, last_notified_at: null }) },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.notified).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    expect(updateCalls).toHaveLength(1)
  })

  it('does not send a second push when already notified today', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد' }],
      states: {
        [USER_A]: haulState({ days_remaining: 5, last_notified_at: new Date().toISOString() }),
      },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.synced).toBe(1)
    expect(json.notified).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
    expect(updateCalls).toHaveLength(0)
  })

  it('syncs but stays silent when the haul is further than 7 days away', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد' }],
      states: { [USER_A]: haulState({ days_remaining: 30, last_notified_at: null }) },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.synced).toBe(1)
    expect(json.notified).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('stays silent when the wealth is below Nisab (days_remaining null)', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد' }],
      states: {
        [USER_A]: haulState({
          nisab_reached_at: null,
          current_haul_due_at: null,
          days_remaining: null,
          is_eligible: false,
          zakatable_assets: 100,
          zakat_due: 0,
        }),
      },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.synced).toBe(1)
    expect(json.notified).toBe(0)
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('skips a user whose sync RPC errors and keeps processing', async () => {
    // USER_A بلا حالة في الـ mock => الخطأ يعود من الـ RPC، USER_B تنجح
    setupMock({
      profiles: [
        { id: USER_A, full_name: 'أحمد' },
        { id: USER_B, full_name: 'سارة' },
      ],
      states: { [USER_B]: haulState({ user_id: USER_B, days_remaining: 3, last_notified_at: null }) },
    })
    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.synced).toBe(1)
    expect(json.notified).toBe(1)
    expect(sendPushToUser).toHaveBeenCalledTimes(1)
    expect((sendPushToUser as jest.Mock).mock.calls[0][0]).toBe(USER_B)
  })

  it('targets a single user when a valid userId param is passed', async () => {
    setupMock({
      profiles: [{ id: USER_A, full_name: 'أحمد' }],
      states: { [USER_A]: haulState({ days_remaining: 2, last_notified_at: null }) },
    })
    const res = await GET(
      makeGetRequest(`http://localhost/api/zakat-autopilot?userId=${USER_A}`)
    )
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.synced).toBe(1)
    expect(mockRpc).toHaveBeenCalledWith('sync_zakat_haul_state', { p_user_id: USER_A })
  })
})
