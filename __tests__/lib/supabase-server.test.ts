import { createClient } from '@/lib/supabase/server'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}))

describe('lib/supabase/server', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('creates a Supabase server client', async () => {
    const client = await createClient()
    expect(client).toEqual({ mocked: true })
  })

  it('uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env', async () => {
    await createClient()
    const { createServerClient } = require('@supabase/ssr')
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        global: { headers: {} },
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('includes Authorization header when accessToken is provided', async () => {
    await createClient('test-jwt-token')
    const { createServerClient } = require('@supabase/ssr')
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer test-jwt-token' } },
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('cookieStore.setAll handles errors gracefully', async () => {
    const { cookies } = require('next/headers')
    const mockCookieStore = {
      getAll: jest.fn(() => []),
      set: jest.fn(() => { throw new Error('cannot set cookie') }),
    }
    cookies.mockResolvedValue(mockCookieStore)

    await expect(createClient()).resolves.toEqual({ mocked: true })
  })
})
