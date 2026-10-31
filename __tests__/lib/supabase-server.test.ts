import { createClient, createClerkClient } from '@/lib/supabase/server'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mocked: true })),
}))

// @clerk/backend ships an ESM-only browser crypto runtime; Jest on Node < 24.9
// cannot `require()` it, so the module is stubbed. `auth()` is the only import.
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mockedClerk: true })),
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

describe('lib/supabase/server — createClerkClient', () => {
  const getToken = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    const { auth } = require('@clerk/nextjs/server')
    auth.mockResolvedValue({ userId: 'user_abc', getToken })
  })

  it('creates a supabase-js client with the env credentials', async () => {
    const client = await createClerkClient()
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')

    expect(client).toEqual({ mockedClerk: true })
    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        accessToken: expect.any(Function),
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    )
  })

  it('accessToken resolves the Clerk session token', async () => {
    getToken.mockResolvedValue('clerk-jwt')
    await createClerkClient()
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const { accessToken } = createSupabaseClient.mock.calls[0][2]

    await expect(accessToken()).resolves.toBe('clerk-jwt')
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  it('accessToken returns null for a signed-out request', async () => {
    getToken.mockResolvedValue(null)
    await createClerkClient()
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const { accessToken } = createSupabaseClient.mock.calls[0][2]

    await expect(accessToken()).resolves.toBeNull()
  })

  it('does not read request cookies', async () => {
    const { cookies } = require('next/headers')
    await createClerkClient()
    expect(cookies).not.toHaveBeenCalled()
  })
})
