jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

describe('lib/supabase/client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('creates a Supabase browser client', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(client).toEqual({ mocked: true })
  })

  it('returns singleton on subsequent calls', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const client1 = createClient()
    const client2 = createClient()
    expect(client1).toBe(client2)
  })

  it('uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    createClient()
    const { createBrowserClient } = require('@supabase/ssr')
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
  })
})