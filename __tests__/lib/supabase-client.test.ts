jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@clerk/nextjs', () => ({
  useSession: jest.fn(() => ({
    session: { getToken: jest.fn().mockResolvedValue('mock-clerk-token') },
  })),
}))

describe('lib/supabase/client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  describe('createClient (Supabase Auth client)', () => {
    it('creates a Supabase browser client', async () => {
      const { createClient } = await import('@/lib/supabase/client')
      expect(createClient()).toEqual({ mocked: true })
    })

    it('returns singleton on subsequent calls', async () => {
      const { createClient } = await import('@/lib/supabase/client')
      expect(createClient()).toBe(createClient())
    })

    it('uses env vars and keeps Supabase auth options without accessToken', async () => {
      const { createClient } = await import('@/lib/supabase/client')
      createClient()
      const { createBrowserClient } = require('@supabase/ssr')
      const options = createBrowserClient.mock.calls[0][2]

      expect(createBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            flowType: 'pkce',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
          }),
        })
      )
      // Regression guard: supabase-js disables the `auth` namespace when
      // `accessToken` is set. The shared Auth client must not set it.
      expect(options.accessToken).toBeUndefined()
    })
  })

  describe('createClerkClient (Clerk token client)', () => {
    it('passes the Clerk session token through the accessToken option', async () => {
      const { createClerkClient } = await import('@/lib/supabase/client')
      const getToken = jest.fn().mockResolvedValue('clerk-jwt-123')

      createClerkClient({ getToken })

      const { createBrowserClient } = require('@supabase/ssr')
      const options = createBrowserClient.mock.calls[0][2]

      expect(typeof options.accessToken).toBe('function')
      await expect(options.accessToken()).resolves.toBe('clerk-jwt-123')
      expect(getToken).toHaveBeenCalled()
    })

    it('resolves null when there is no Clerk session', async () => {
      const { createClerkClient } = await import('@/lib/supabase/client')

      createClerkClient(null)

      const { createBrowserClient } = require('@supabase/ssr')
      const options = createBrowserClient.mock.calls[0][2]

      await expect(options.accessToken()).resolves.toBeNull()
    })
  })
})
