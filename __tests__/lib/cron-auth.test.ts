/**
 * @jest-environment node
 */
import { verifyCronAuth } from '@/lib/cron-auth'
import { NextRequest } from 'next/server'

describe('verifyCronAuth', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-123'
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns true when token matches secret', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer test-secret-123' }
    })
    expect(verifyCronAuth(req)).toBe(true)
  })

  it('returns false when token does not match secret', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer wrong-token' }
    })
    expect(verifyCronAuth(req)).toBe(false)
  })

  it('returns false when no Authorization header', () => {
    const req = new NextRequest('http://localhost/api/test')
    expect(verifyCronAuth(req)).toBe(false)
  })

  it('returns false when Authorization does not start with Bearer', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Basic some-token' }
    })
    expect(verifyCronAuth(req)).toBe(false)
  })

  it('returns false when lengths differ (timing-safe equal)', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer short' }
    })
    expect(verifyCronAuth(req)).toBe(false)
  })

  it('throws when CRON_SECRET env var is not set', () => {
    const orig = process.env.CRON_SECRET
    delete process.env.CRON_SECRET
    const req = new NextRequest('http://localhost/api/test', {
      headers: { authorization: 'Bearer test' }
    })
    try {
      verifyCronAuth(req)
      expect(true).toBe(false) // should not reach here
    } catch (e: unknown) {
      expect((e as Error).message).toContain('CRON_SECRET is not set')
    } finally {
      if (orig !== undefined) process.env.CRON_SECRET = orig
    }
  })
})