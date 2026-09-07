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

  it('should insert and return 1 when prefs allow, subscription exists, fingerprint is new', async () => {
    resolveNext({ data: null, error: null })                       // notification_preferences
    resolveNext({ count: 1, error: null })                          // push_subscriptions
    resolveNext({ count: 0, error: null })                          // dedupe fingerprint
    resolveNext({ error: null })                                    // insert

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    const fromCalls = mockSupabaseInstance.from.mock.calls.map(c => c[0])
    expect(fromCalls).toEqual([
      'notification_preferences',
      'push_subscriptions',
      'notification_history', // dedupe fingerprint check
      'notification_history', // insert
    ])
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('enabled, quiet_start, quiet_end, profiles(timezone)')
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 without insert when the category is disabled in preferences', async () => {
    resolveNext({ data: [{ enabled: false, quiet_start: null, quiet_end: null }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should return 0 without insert when now is inside quiet hours (explicit timezone)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T12:30:00Z'))
    resolveNext({ data: [{ enabled: true, quiet_start: '12:00', quiet_end: '13:00', profiles: { timezone: 'UTC' } }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should default timezone to Asia/Amman when profile join is missing', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T09:30:00Z')) // 12:30 in Amman (UTC+3)
    resolveNext({ data: [{ enabled: true, quiet_start: '12:00', quiet_end: '13:00', profiles: null }], error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should return 0 without insert when the user has no push subscriptions', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 0, error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should skip insert when the fingerprint was already sent today', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 1, error: null }) // dedupe hit

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should proceed to insert when the dedupe check fails', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: { code: '500', message: 'Server error' } })
    resolveNext({ error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)

    expect(result).toBe(1)
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 on duplicate insert error (23505)', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '23505' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })

  it('should return 0 on other database errors', async () => {
    resolveNext({ data: null, error: null })
    resolveNext({ count: 1, error: null })
    resolveNext({ count: 0, error: null })
    resolveNext({ error: { code: '500', message: 'Server error' } })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
  })
})