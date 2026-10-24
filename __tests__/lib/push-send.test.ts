// Behavior changes as of Track D Phase A.1 (2026-10-24):
// push-send.ts no longer performs pre-filter checks for disabled
// categories, quiet hours, or missing subscriptions. Those checks
// live in the Edge Function (supabase/functions/push-notification).
// Tests for them were removed here and will be added in Phase A.2
// against the Edge Function.
//
// What push-send.ts does now:
//   1. Compute fingerprint
//   2. Dedupe check (fingerprint pre-check)
//   3. Insert notification_history
//   4. Handle 23505
//   5. Return 1 on success, 0 on failure/dedup

const mockSupabaseInstance = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  insert: jest.fn(),
  then: jest.fn(),
}

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseInstance)
}))

import { sendPushToUser, getHHMMInTimeZone, isInQuietHours } from '../../lib/push-send'

describe('getHHMMInTimeZone', () => {
  it('returns UTC minutes at a fixed instant', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'UTC')).toBe(12 * 60 + 30)
  })

  it('applies the timezone offset (Asia/Amman = UTC+3)', () => {
    const d = new Date('2026-09-07T12:30:00Z')
    expect(getHHMMInTimeZone(d, 'Asia/Amman')).toBe(15 * 60 + 30)
  })

  it('handles hour 23 in an offset timezone (America/New_York = UTC-4, DST off)', () => {
    const d = new Date('2026-01-15T03:30:00Z')
    expect(getHHMMInTimeZone(d, 'America/New_York')).toBe(22 * 60 + 30)
  })
})

describe('isInQuietHours', () => {
  it('is true inside a normal window and false at its end (end-exclusive)', () => {
    expect(isInQuietHours('12:00', '13:00', 12 * 60 + 30)).toBe(true)
    expect(isInQuietHours('12:00', '13:00', 13 * 60)).toBe(false)
  })

  it('is true inside an overnight window and false outside it', () => {
    expect(isInQuietHours('22:00', '07:00', 23 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 3 * 60)).toBe(true)
    expect(isInQuietHours('22:00', '07:00', 12 * 60)).toBe(false)
  })
})

describe('sendPushToUser', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    mockSupabaseInstance.from.mockReturnThis()
    mockSupabaseInstance.select.mockReturnThis()
    mockSupabaseInstance.eq.mockReturnThis()
    mockSupabaseInstance.order.mockReturnThis()
    mockSupabaseInstance.limit.mockReturnThis()
    mockSupabaseInstance.insert.mockReturnThis()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleErrorSpy.mockRestore()
  })

  const resolveNext = (result: any) =>
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn(result)))

  it('should insert and return 1 when fingerprint is new', async () => {
    resolveNext({ count: 0, error: null })                          // dedupe fingerprint
    resolveNext({ error: null })                                    // insert

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    const fromCalls = mockSupabaseInstance.from.mock.calls.map(c => c[0])
    expect(fromCalls).toEqual([
      'notification_history', // dedupe fingerprint check
      'notification_history', // insert
    ])
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should skip insert when the fingerprint was already sent today', async () => {
    resolveNext({ count: 1, error: null }) // dedupe hit

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should proceed to insert when the dedupe check fails', async () => {
    resolveNext({ count: 0, error: { code: '500', message: 'Server error' } })
    resolveNext({ error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 on duplicate insert error (23505)', async () => {
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '23505' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })

  it('should return 0 on other database errors', async () => {
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '500', message: 'Server error' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })
})
