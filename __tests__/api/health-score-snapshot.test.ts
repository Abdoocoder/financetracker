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
import { calcScore } from '@/app/api/health-score-snapshot/calc'

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

// ── calcScore algorithm ───────────────────────────────────────────────────────
describe('calcScore', () => {
  // ── savings rate (30 pts max) ──
  it('gives 30 pts for savings rate ≥ 20%', () => {
    // income=1000, expenses=800 → rate=20%, debt=8000 (0 pt)
    expect(calcScore(1000, 800, 8000, 0, 0, 0)).toBe(30)
  })

  it('gives 20 pts for savings rate 10–19%', () => {
    // income=1000, expenses=900 → rate=10%, debt=8000 (0 pt)
    expect(calcScore(1000, 900, 8000, 0, 0, 0)).toBe(20)
  })

  it('gives 10 pts for savings rate 1–9%', () => {
    // income=1000, expenses=950 → rate=5%, debt=8000 (0 pt)
    expect(calcScore(1000, 950, 8000, 0, 0, 0)).toBe(10)
  })

  it('gives 0 savings pts when expenses ≥ income', () => {
    expect(calcScore(1000, 1000, 8000, 0, 0, 0)).toBe(0)
    expect(calcScore(1000, 1100, 8000, 0, 0, 0)).toBe(0)
  })

  // ── debt ratio (25 pts max) ──
  it('gives 25 pts for zero debt', () => {
    // savings ≥20% = 30pts, debt=0 = 25pts → 55
    expect(calcScore(1000, 800, 0, 0, 0, 0)).toBe(30 + 25)
  })

  it('gives 20 pts for debt ratio < 30% of annual income', () => {
    // income=1000/mo → annual=12000; debt=3000 → ratio=0.25 < 0.3
    const score = calcScore(1000, 900, 3000, 0, 0, 0)
    expect(score).toBe(20 + 20) // 20 savings + 20 debt
  })

  it('gives 10 pts for debt ratio 30–59%', () => {
    // income=1000/mo → annual=12000; debt=5000 → ratio≈0.42
    const score = calcScore(1000, 900, 5000, 0, 0, 0)
    expect(score).toBe(20 + 10) // 20 savings + 10 debt
  })

  it('gives 0 debt pts when ratio ≥ 60%', () => {
    // income=1000/mo → annual=12000; debt=8000 → ratio≈0.67
    const score = calcScore(1000, 900, 8000, 0, 0, 0)
    expect(score).toBe(20 + 0)
  })

  // ── emergency fund (20 pts max) ──
  it('gives 20 pts when goals_saved ≥ 3 months income', () => {
    // 3 months = 3000; goalsSaved=3000
    const score = calcScore(1000, 800, 0, 0, 3000, 0)
    expect(score).toBe(30 + 25 + 20)
  })

  it('gives 12 pts when goals_saved is 50–99% of emergency fund', () => {
    // 50% of 3000 = 1500
    const score = calcScore(1000, 800, 0, 0, 1500, 0)
    expect(score).toBe(30 + 25 + 12)
  })

  it('gives 6 pts for any positive emergency savings', () => {
    const score = calcScore(1000, 800, 0, 0, 100, 0)
    expect(score).toBe(30 + 25 + 6)
  })

  // ── investment (15 pts) ──
  it('gives 15 pts when portfolio value > 0', () => {
    const score = calcScore(1000, 800, 0, 1000, 0, 0)
    expect(score).toBe(30 + 25 + 15)
  })

  it('gives 0 investment pts when portfolio is empty', () => {
    const score = calcScore(1000, 800, 0, 0, 0, 0)
    expect(score).toBe(30 + 25)
  })

  // ── tracking activity (10 pts max) ──
  it('gives 10 pts for ≥ 10 transactions', () => {
    expect(calcScore(1000, 800, 0, 0, 0, 10)).toBe(30 + 25 + 10)
    expect(calcScore(1000, 800, 0, 0, 0, 15)).toBe(30 + 25 + 10)
  })

  it('gives 6 pts for 5–9 transactions', () => {
    expect(calcScore(1000, 800, 0, 0, 0, 5)).toBe(30 + 25 + 6)
  })

  it('gives 3 pts for 1–4 transactions', () => {
    expect(calcScore(1000, 800, 0, 0, 0, 1)).toBe(30 + 25 + 3)
  })

  it('gives 0 pts for zero transactions', () => {
    expect(calcScore(1000, 800, 0, 0, 0, 0)).toBe(30 + 25)
  })

  // ── max cap ──
  it('never exceeds 100', () => {
    // Perfect scenario: high savings, no debt, full emergency, investments, active
    expect(calcScore(10000, 5000, 0, 50000, 100000, 20)).toBe(100)
  })

  // ── zero income edge case ──
  it('handles zero income without crashing', () => {
    const score = calcScore(0, 0, 0, 0, 0, 0)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
