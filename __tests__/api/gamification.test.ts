/**
 * @jest-environment node
 */
var mockFrom = jest.fn()
var mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
var mockLessonForStage: jest.Mock
var mockDetermineStage: jest.Mock

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  })),
}))

jest.mock('@/lib/daily-lessons', () => ({
  getLessonForStage: mockLessonForStage ?? jest.fn().mockReturnValue({ title: 'Lesson', body: 'Body', url: '/lesson' }),
  determineStage: mockDetermineStage ?? jest.fn().mockReturnValue('beginner'),
}))

jest.mock('@/lib/push-send', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(1),
}))

jest.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: jest.fn().mockReturnValue(true),
}))

import { POST, GET } from '@/app/api/gamification/route'
import { NextRequest } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'

function makePostRequest(body: any, token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest('http://localhost/api/gamification', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function makeGetRequest(url = 'http://localhost/api/gamification', token?: string) {
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`
  return new NextRequest(url, { headers })
}

function setupMock(tableData: Record<string, any> = {}) {
  mockFrom.mockClear()
  mockGetUser.mockClear()
  ;(sendPushToUser as jest.Mock).mockClear()
  mockLessonForStage?.mockClear()
  mockDetermineStage?.mockClear()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'transactions') return chain({ data: tableData.transactions ?? [], error: null })
    if (table === 'debts') return chain({ data: tableData.debts ?? [], error: null })
    if (table === 'investments') return chain({ data: tableData.investments ?? [], error: null })
    if (table === 'savings_goals') return chain({ data: tableData.savings_goals ?? [], error: null })
    if (table === 'user_stats') return chain({ data: tableData.user_stats ?? { badges: [], total_points: 0 }, error: null })
    if (table === 'profiles') return chain({ data: tableData.profiles ?? { monthly_income: 5000, lesson_streak: 0 }, error: null })
    if (table === 'alerts') return chain({ data: tableData.alerts ?? [], error: null })
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

describe('POST /api/gamification', () => {
  beforeEach(() => {
    mockLessonForStage?.mockReset()
    mockDetermineStage?.mockReset()
  })

  it('returns 401 without Authorization header', async () => {
    const req = makePostRequest({ user_id: 'u1' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    const req = makePostRequest({ user_id: 'u1' }, 'invalid-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user_id does not match authenticated user', async () => {
    const req = makePostRequest({ user_id: 'other-user' }, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('calculates stats and awards new badges', async () => {
    setupMock({
      transactions: [
        { type: 'income', amount: 1000, transaction_date: '2026-09-01' },
        { type: 'expense', amount: 200, transaction_date: '2026-09-02' },
      ],
      debts: [],
      investments: [],
      savings_goals: [],
      user_stats: { badges: [], total_points: 0 },
      profiles: { monthly_income: 1000, lesson_streak: 0 },
    })

    const req = makePostRequest({ user_id: 'u1' }, 'valid-token')
    const res = await POST(req)
    const json = await res.json()
    expect(json.streak).toBeDefined()
    expect(json.level).toBeDefined()
    expect(json.badges).toBeDefined()
    expect(json.new_badges).toBeDefined()
    expect(sendPushToUser).not.toHaveBeenCalled()
  })

  it('returns stats including level and new badges', async () => {
    setupMock({
      transactions: [
        { type: 'income', amount: 1000, transaction_date: '2026-09-01' },
        { type: 'expense', amount: 200, transaction_date: '2026-09-02' },
      ],
      debts: [],
      investments: [],
      savings_goals: [],
      user_stats: { badges: [], total_points: 0 },
      profiles: { monthly_income: 1000, lesson_streak: 0 },
    })

    const req = makePostRequest({ user_id: 'u1' }, 'valid-token')
    const res = await POST(req)
    const json = await res.json()
    expect(json.stats).toBeDefined()
    expect(json.level).toBeDefined()
    expect(json.points).toBeDefined()
    expect(json.new_badges).toBeDefined()
  })
})

describe('GET /api/gamification', () => {
  it('returns 401 without Authorization header', async () => {
    const req = makeGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns user_stats with levelInfo', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'u1' } }, error: null })
    setupMock({
      user_stats: { streak: 5, points: 100, badges: ['tx_50'] },
    })

    const req = makeGetRequest(undefined, 'valid-token')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toBeDefined()
    expect(json.levelInfo).toBeDefined()
  })
})