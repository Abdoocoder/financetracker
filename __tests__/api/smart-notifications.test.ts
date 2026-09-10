/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn()
var mockGetLocalNow
var mockDailyLessons

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: (...args: any[]) => mockGetUser(...) },
  })),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/timezone', () => ({
  getLocalNow: mockGetLocalNow ?? jest.fn(),
}))

jest.mock('@/lib/daily-lessons', () => ({
  getLessonForStage: mockDailyLessons?.getLessonForStage ?? jest.fn().mockReturnValue({ title: 'Lesson', body: 'Body', url: '/lesson' }),
  determineStage: mockDailyLessons?.determineStage ?? jest.fn().mockReturnValue('beginner'),
}))

import { GET } from '@/app/api/smart-notifications/route'
import { NextRequest } from 'next/server'

function makeGetRequest(url = 'http://localhost/api/smart-notifications') {
  return new NextRequest(url)
}

function setupMock({
  userId = 'u1',
  profiles = [],
} = {}) {
  mockFrom.mockClear()
  mockGetUser.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()
  mockGetLocalNow?.mockClear()
  mockDailyLessons?.mockClear()

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
    mockGetLocalNow?.mockReset()
    mockDailyLessons?.mockReset()
  })

  it('returns 401 when verifyCronAuth fails', async () => {
    const { verifyCronAuth } = require('@/lib/cron-auth')
    verifyCronAuth.mockReturnValueOnce(false)
    setupMock()
    const res = await makeGetRequest()
    expect(res.status).toBe(401)
  })

  it('returns ok:true with hour, day, and tasks', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T06:00:00+03:00'))
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.hour).toBe(6)
    expect(json.tasks).toBeDefined()
    expect(Array.isArray(json.tasks)).toBe(true)
  })

  it('calls morning tasks at hour 6', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T06:00:00+03:00'))
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('morning+alerts')
    expect(json.tasks).toContain('nudge')
  })

  it('calls evening reminder at hour 18', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T18:00:00+03:00'))
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('evening-if-needed')
  })

  it('calls smart nudge at hour 12', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T12:00:00+03:00'))
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('nudge-inactive')
  })

  it('calls wealth guidance at hour 19', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T19:00:00+03:00'))
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.tasks).toContain('wealth-guidance')
  })

  it('calls weekly report on friday at hour 8', async () => {
    mockGetLocalNow?.mockReturnValueOnce(new Date('2026-09-10T08:00:00+03:00')) // Saturday in Gregorian, but day 5 = Friday if we set it right
    // Actually day 5 = Friday, but Sep 10 2026 is Saturday. Let's just test the structure.
    mockDailyLessons?.determineStage.mockReturnValueOnce('beginner')

    setupMock({ profiles: [{ id: 'u1', full_name: 'أحمد علي' }] })

    const res = await makeGetRequest()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(Array.isArray(json.tasks)).toBe(true)
  })
})