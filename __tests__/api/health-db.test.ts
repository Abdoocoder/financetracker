/**
 * @jest-environment node
 */

// ── Mock the Neon driver before any imports ───────────────────────────────────
const mockQuery = jest.fn()

jest.mock('@neondatabase/serverless', () => ({
  neon: jest.fn(() => mockQuery),
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/health/db/route'

const SECRET = 'test-secret'
const ENDPOINT = 'http://localhost:3000/api/health/db'

function makeRequest(secret?: string) {
  return new NextRequest(ENDPOINT, {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

let consoleError: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  process.env.DATABASE_URL = 'postgresql://user:pass@example-pooler.neon.tech/db'
  process.env.CRON_SECRET = SECRET
  mockQuery.mockResolvedValue([{ count: 54 }])
})

afterEach(() => {
  consoleError.mockRestore()
})

describe('GET /api/health/db', () => {
  it('reports reachability without disclosing the account count', async () => {
    const res = await GET(makeRequest())

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, database: 'reachable' })
    expect(body).not.toHaveProperty('profiles')
    expect(typeof body.latencyMs).toBe('number')
  })

  it('returns the profile count to a caller holding CRON_SECRET', async () => {
    const res = await GET(makeRequest(SECRET))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      ok: true,
      database: 'reachable',
      profiles: 54,
    })
  })

  it('does not disclose the count for a wrong token', async () => {
    const res = await GET(makeRequest('wrong-token'))

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).not.toHaveProperty('profiles')
  })

  it('queries only the profiles table', async () => {
    await GET(makeRequest(SECRET))

    const [strings] = mockQuery.mock.calls[0]
    expect(strings.join(' ')).toMatch(
      /select count\(\*\)::int as count from public\.profiles/
    )
  })

  it('returns 503 when the Neon query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'))

    const res = await GET(makeRequest())

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, database: 'unreachable' })
  })

  it('returns 503 — not 500 — when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL

    const res = await GET(makeRequest())

    expect(res.status).toBe(503)
  })

  it('never leaks connection details in the error response', async () => {
    mockQuery.mockRejectedValueOnce(
      new Error('password authentication failed for user "neondb_owner"')
    )

    const res = await GET(makeRequest())
    const text = await res.text()

    expect(text).not.toMatch(/neondb_owner/)
    expect(text).not.toMatch(/password/i)
    expect(text).not.toMatch(/postgresql:\/\//)
  })

  it('disables caching so a probe is never served stale', async () => {
    const res = await GET(makeRequest())

    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
