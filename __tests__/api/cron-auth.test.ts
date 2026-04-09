/**
 * @jest-environment node
 */
import { verifyCronAuth } from '@/lib/cron-auth'
import { NextRequest } from 'next/server'

const SECRET = 'super-secret-cron-token'

function req(authHeader?: string) {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/test', { headers })
}

describe('verifyCronAuth', () => {
  const original = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
  })

  afterAll(() => {
    process.env.CRON_SECRET = original
  })

  it('throws when CRON_SECRET is not set', () => {
    delete process.env.CRON_SECRET
    expect(() => verifyCronAuth(req(`Bearer ${SECRET}`))).toThrow('CRON_SECRET is not set')
  })

  it('returns false when authorization header is missing', () => {
    expect(verifyCronAuth(req())).toBe(false)
  })

  it('returns false when header does not start with "Bearer "', () => {
    expect(verifyCronAuth(req(SECRET))).toBe(false)
    expect(verifyCronAuth(req(`Token ${SECRET}`))).toBe(false)
  })

  it('returns false when token does not match secret', () => {
    expect(verifyCronAuth(req('Bearer wrong-token'))).toBe(false)
    expect(verifyCronAuth(req('Bearer '))).toBe(false)
  })

  it('returns true when token matches secret exactly', () => {
    expect(verifyCronAuth(req(`Bearer ${SECRET}`))).toBe(true)
  })

  it('returns false for partial token match', () => {
    expect(verifyCronAuth(req(`Bearer ${SECRET.slice(0, -1)}`))).toBe(false)
    expect(verifyCronAuth(req(`Bearer ${SECRET}x`))).toBe(false)
  })
})
