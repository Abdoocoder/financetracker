/**
 * @jest-environment node
 */

// ── Mock Supabase before any imports ──────────────────────────────────────────
import { createMockSupabase, makeRequest } from '../helpers/supabase-mock'

var mockSupabase: ReturnType<typeof createMockSupabase>;

jest.mock('@supabase/supabase-js', () => {
  const { createMockSupabase } = require('../helpers/supabase-mock');
  mockSupabase = createMockSupabase();
  return {
    createClient: jest.fn(() => mockSupabase),
  }
})

import { GET } from '@/app/api/health-score-snapshot/route'

// ── Environment ───────────────────────────────────────────────────────────────
const SECRET = 'test-secret'

beforeEach(() => {
  process.env.CRON_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  mockSupabase = createMockSupabase()
})

// ── Auth guard ────────────────────────────────────────────────────────────────
describe('GET /api/health-score-snapshot — auth', () => {
  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ error: 'Unauthorized' })
  })

  it('returns 401 with wrong token', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: 'bad-token' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 with correct token', async () => {
    const res = await GET(makeRequest('/api/health-score-snapshot', { secret: SECRET }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, saved: 0 })
  })
})
