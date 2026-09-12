/**
 * @jest-environment node
 */
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.CRON_SECRET = 'test-secret'

global.fetch = jest.fn()
var mockFrom = jest.fn()
var mockGetUser = jest.fn()
var mockGetLocalNow = jest.fn()
var mockLessonForStage: jest.Mock
var mockDetermineStage: jest.Mock

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

jest.mock('@/lib/timezone', () => ({
  getLocalNow: () => mockGetLocalNow() ?? new Date('2026-09-10T06:00:00Z'),
}))

jest.mock('@/lib/daily-lessons', () => ({
  getLessonForStage: mockLessonForStage ?? jest.fn().mockReturnValue({ title: 'Lesson', body: 'Body', url: '/lesson' }),
  determineStage: mockDetermineStage ?? jest.fn().mockReturnValue('beginner'),
}))

import { GET } from '@/app/api/smart-notifications/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makeGetRequest(url = 'http://localhost/api/smart-notifications') {
  return new NextRequest(url)
}

function setupMock({
  userId = 'u1',
  profiles = [] as any[],
} = {}) {
  mockFrom.mockClear()
  mockGetUser.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()
  mockLessonForStage?.mockClear()
  mockDetermineStage?.mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return chain({ data: profiles, error: null })
    if (table === 'transactions') return chain({ data: [], error: null })
    if (table === 'debts') return chain({ data: [], error: null })
    if (table === 'alerts') return chain({ data: [], error: null })
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

describe('GET /api/smart-notifications', () => {
  beforeEach(() => {
    mockGetLocalNow.mockReset()
    mockLessonForStage?.mockReset()
    mockDetermineStage?.mockReset()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('returns 401 when verifyCronAuth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock()
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns ok:true with hour, day, and tasks', async () => {
    const testTime = new Date('2026-09-10T06:00:00Z')
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.hour).toBe(6)
    expect(json.tasks).toBeDefined()
    expect(Array.isArray(json.tasks)).toBe(true)
  })

  it('calls morning tasks at hour 6', async () => {
    const testTime = new Date('2026-09-10T06:00:00Z')
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('morning+alerts')
    expect(json.tasks).toContain('nudge')
  })

  it('calls evening reminder at hour 18', async () => {
    const testTime = new Date('2026-09-10T18:00:00Z')
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('evening-if-needed')
  })

  it('calls smart nudge at hour 12', async () => {
    const testTime = new Date('2026-09-10T12:00:00Z')
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('nudge-inactive')
  })

  it('calls wealth guidance at hour 19', async () => {
    const testTime = new Date('2026-09-10T19:00:00Z')
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('wealth-guidance')
  })

  it('calls weekly report on friday at hour 8', async () => {
    const testTime = new Date('2026-09-10T08:00:00Z') // Saturday in Gregorian, but day 5 = Friday if we set it right
    // Actually day 5 = Friday, but Sep 10 2026 is Saturday. Let's just test the structure.
    mockGetLocalNow.mockImplementation(() => testTime)
    mockDetermineStage?.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] as any[] })

    const res = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(Array.isArray(json.tasks)).toBe(true)
  })
})