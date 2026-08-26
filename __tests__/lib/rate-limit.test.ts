/**
 * @jest-environment node
 */
import { rateLimit } from '@/lib/rate-limit'

let ipCounter = 0

function uniqueIp(): string {
  ipCounter++
  return `10.0.${ipCounter}.1`
}

function makeRequest(ip?: string): Request {
  const headers = new Headers()
  if (ip) headers.set('x-forwarded-for', ip)
  return new Request('http://localhost/api/test', { headers })
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('rateLimit', () => {
  it('allows first request with ok: true', () => {
    const ip = uniqueIp()
    const result = rateLimit(makeRequest(ip), { limit: 5, windowMs: 60_000 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('decrements remaining on each request', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    const r1 = rateLimit(req, { limit: 5, windowMs: 60_000 })
    expect(r1.remaining).toBe(4)

    const r2 = rateLimit(req, { limit: 5, windowMs: 60_000 })
    expect(r2.remaining).toBe(3)

    const r3 = rateLimit(req, { limit: 5, windowMs: 60_000 })
    expect(r3.remaining).toBe(2)
  })

  it('returns ok: true when count reaches limit', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    rateLimit(req, { limit: 2, windowMs: 60_000 })
    const r2 = rateLimit(req, { limit: 2, windowMs: 60_000 })
    expect(r2.ok).toBe(true)
    expect(r2.remaining).toBe(0)
  })

  it('returns ok: false when count exceeds limit', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    rateLimit(req, { limit: 2, windowMs: 60_000 })
    rateLimit(req, { limit: 2, windowMs: 60_000 })
    const r3 = rateLimit(req, { limit: 2, windowMs: 60_000 })
    expect(r3.ok).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('resets window after windowMs elapses', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    rateLimit(req, { limit: 2, windowMs: 60_000 })
    rateLimit(req, { limit: 2, windowMs: 60_000 })
    // third request exceeds
    const r3 = rateLimit(req, { limit: 2, windowMs: 60_000 })
    expect(r3.ok).toBe(false)

    // advance time past the window
    jest.advanceTimersByTime(61_000)

    // new window starts
    const r4 = rateLimit(req, { limit: 2, windowMs: 60_000 })
    expect(r4.ok).toBe(true)
    expect(r4.remaining).toBe(1)
  })

  it('includes correct headers', () => {
    const result = rateLimit(makeRequest(uniqueIp()), { limit: 10, windowMs: 60_000 })
    expect(result.headers['X-RateLimit-Limit']).toBe('10')
    expect(result.headers['X-RateLimit-Remaining']).toBe('9')
    expect(result.headers['X-RateLimit-Reset']).toBeDefined()
    expect(Number(result.headers['X-RateLimit-Reset'])).toBeGreaterThan(0)
  })

  it('includes Retry-After when over limit', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    rateLimit(req, { limit: 1, windowMs: 60_000 })
    const r2 = rateLimit(req, { limit: 1, windowMs: 60_000 })
    expect(r2.ok).toBe(false)
    expect(r2.headers['Retry-After']).toBeDefined()
    expect(Number(r2.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('does not include Retry-After when under limit', () => {
    const result = rateLimit(makeRequest(uniqueIp()), { limit: 5, windowMs: 60_000 })
    expect(result.headers['Retry-After']).toBeUndefined()
  })

  it('isolates by identifier', () => {
    const ip = uniqueIp()
    const req = makeRequest(ip)
    rateLimit(req, { limit: 1, windowMs: 60_000, identifier: 'route-a' })
    const r2 = rateLimit(req, { limit: 1, windowMs: 60_000, identifier: 'route-b' })
    expect(r2.ok).toBe(true) // different identifier = separate bucket
  })

  it('isolates by IP', () => {
    const req1 = makeRequest(uniqueIp())
    const req2 = makeRequest(uniqueIp())
    rateLimit(req1, { limit: 1, windowMs: 60_000 })
    const r2 = rateLimit(req2, { limit: 1, windowMs: 60_000 })
    expect(r2.ok).toBe(true) // different IP = separate bucket
  })

  it('falls back to "unknown" when no x-forwarded-for header', () => {
    const req = makeRequest()
    const ip = uniqueIp() // just for uniqueness
    // Use same request twice (no IP header → "unknown" key)
    // This will share the "unknown" bucket with any other test using no IP
    // But since we use fake timers and it's a fresh window, this works
    const r1 = rateLimit(req, { limit: 1, windowMs: 60_000 })
    expect(r1.ok).toBe(true)
    const r2 = rateLimit(req, { limit: 1, windowMs: 60_000 })
    expect(r2.ok).toBe(false) // same "unknown" key = shared bucket
  })

  it('uses first IP from comma-separated x-forwarded-for', () => {
    const headers = new Headers()
    headers.set('x-forwarded-for', '10.0.0.1, 10.0.0.2, 10.0.0.3')
    const req = new Request('http://localhost/api/test', { headers })
    rateLimit(req, { limit: 1, windowMs: 60_000 })
    const r2 = rateLimit(req, { limit: 1, windowMs: 60_000 })
    expect(r2.ok).toBe(false) // same first IP → shared bucket
  })

  it('uses default limit of 20 when not specified', () => {
    const result = rateLimit(makeRequest(uniqueIp()))
    expect(result.headers['X-RateLimit-Limit']).toBe('20')
    expect(result.remaining).toBe(19)
  })
})
