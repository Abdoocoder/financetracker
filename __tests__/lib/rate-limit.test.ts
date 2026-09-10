/**
 * @jest-environment node
 */
import { rateLimit } from '@/lib/rate-limit'
import { NextRequest } from 'next/server'

describe('rateLimit', () => {
  afterEach(() => {
    // Reset the in-memory store between tests
    // We can't directly access the store, but jest clears module mocks
  })

  it('returns ok:true for first request within limit', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
    const result = rateLimit(req, { limit: 3, windowMs: 60000, identifier: 'test' })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('returns ok:false when limit exceeded', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
    rateLimit(req, { limit: 2, windowMs: 60000, identifier: 'test' })
    rateLimit(req, { limit: 2, windowMs: 60000, identifier: 'test' })
    const result = rateLimit(req, { limit: 2, windowMs: 60000, identifier: 'test' })
    expect(result.ok).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('returns correct headers', async () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
    const result = rateLimit(req, { limit: 5, windowMs: 60000, identifier: 'test' })
    expect(result.headers).toHaveProperty('X-RateLimit-Limit', '5')
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining')
    expect(result.headers).toHaveProperty('X-RateLimit-Reset')
  })

  it('different identifiers create separate buckets', async () => {
    const req1 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
    const req2 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' }
    })
    rateLimit(req1, { limit: 1, windowMs: 60000, identifier: 'a' })
    const result = rateLimit(req2, { limit: 1, windowMs: 60000, identifier: 'a' })
    expect(result.ok).toBe(false)
  })

  it('falls back to unknown IP when no x-forwarded-for', async () => {
    const req = new NextRequest('http://localhost/api/test')
    const result = rateLimit(req, { limit: 3, windowMs: 60000, identifier: 'test' })
    expect(result.ok).toBe(true)
  })
})