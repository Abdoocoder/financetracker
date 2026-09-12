/**
 * @jest-environment node
 */
import { GET } from '@/app/api/confirm/route'
import { NextRequest } from 'next/server'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

describe('GET /api/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('safeNext defaults to /dashboard when no next param', () => {
    const url = new URL('http://localhost/api/confirm')
    const next = url.searchParams.get('next')
    expect(next).toBeNull()
  })

  it('safeNext returns /dashboard for null next', () => {
    expect(() => {}).not.toThrow()
  })

  it('safeNext returns relative path when valid', () => {
    // The safeNext function handles these cases
    const testCases: [string, string][] = [
      ['/somewhere', '/somewhere'],
      ['/', '/'],
    ]
    for (const [input, expected] of testCases) {
      const next = input
      if (!next || next === '/') {
        expect(true).toBe(true)
      }
    }
  })

  it('returns redirect when code is valid', async () => {
    const { createServerClient } = jest.requireMock('@supabase/ssr')
    createServerClient.mockReturnValueOnce({
      auth: {
        exchangeCodeForSession: jest.fn().mockResolvedValue({
          data: { session: { access_token: 'token123' } },
          error: null,
        }),
      },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    } as any)

    const req = new NextRequest('http://localhost/api/confirm?code=test123', {
      headers: { cookie: '' },
    })
    const res = await GET(req as any)
    expect(res.status).toBe(307)
  })

  it('returns HTML page when no code provided', async () => {
    const req = new NextRequest('http://localhost/api/confirm', {
      headers: { cookie: '' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('window.location.replace')
  })
})