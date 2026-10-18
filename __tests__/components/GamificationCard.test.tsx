/**
 * Regression test for the production 401s on /api/gamification.
 *
 * The route requires a Bearer JWT. GamificationCard was the only caller that
 * never attached one (the GET even sent a meaningless ?user_id= query param),
 * so both requests got 401 and the card silently rendered nothing.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockGetSession = jest.fn()
const mockFrom = jest.fn()

const mockUser = { id: 'u1' }

jest.mock('@/lib/user-context', () => ({
  useUser: () => ({ user: mockUser, profile: null, loading: false }),
}))

jest.mock('@/lib/i18n', () => ({
  useI18n: () => ({ lang: 'en' }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: (...args: any[]) => mockGetSession(...args) },
    from: (...args: any[]) => mockFrom(...args),
  }),
}))

import { GamificationCard } from '@/components/dashboard/GamificationCard'

// Thenable chain for: supabase.from('transactions').select(...).eq(...).eq(...).then(...)
function txChain(count: number) {
  const p = Promise.resolve({ count })
  const obj: any = {
    select: () => obj,
    eq: () => obj,
    then: (res: any, rej: any) => p.then(res, rej),
    catch: (fn: any) => p.catch(fn),
  }
  return obj
}

const GET_BODY = {
  streak: 2,
  total_points: 30,
  badges: [],
  levelInfo: { level: 1, title_en: 'Beginner', title_ar: 'مبتدئ', next: 50 },
}

const POST_BODY = {
  streak: 2,
  points: 30,
  level: { level: 1, title_en: 'Beginner', title_ar: 'مبتدئ', next: 50 },
  badges: [],
  new_badges: [],
  stats: {},
}

describe('GamificationCard auth headers', () => {
  let calls: { url: string; init: any }[]
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    calls = []
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    })
    mockFrom.mockReturnValue(txChain(1))
    global.fetch = jest.fn((url: string, init: any = {}) => {
      calls.push({ url, init })
      const body = init.method === 'POST' ? POST_BODY : GET_BODY
      return Promise.resolve({ json: () => Promise.resolve(body) })
    }) as any
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends the Bearer token on the GET request', async () => {
    render(<GamificationCard />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    const getCall = calls.find(c => !c.init.method || c.init.method === 'GET')
    expect(getCall).toBeDefined()
    expect(getCall!.init.headers?.Authorization).toBe('Bearer test-token')
    // The route derives the user from the token; the query param was dead weight.
    expect(getCall!.url).toBe('/api/gamification')
  })

  it('sends the Bearer token on the POST request', async () => {
    render(<GamificationCard />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

    const postCall = calls.find(c => c.init.method === 'POST')
    expect(postCall).toBeDefined()
    expect(postCall!.init.headers.Authorization).toBe('Bearer test-token')
    expect(postCall!.init.body).toBe(JSON.stringify({ user_id: 'u1' }))
  })

  it('still resolves loading state when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    render(<GamificationCard />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const getCall = calls[0]
    expect(getCall.init.headers?.Authorization).toBeUndefined()
  })
})
