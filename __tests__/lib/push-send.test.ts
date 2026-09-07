const mockSupabaseInstance = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
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
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    mockSupabaseInstance.from.mockReturnThis()
    mockSupabaseInstance.select.mockReturnThis()
    mockSupabaseInstance.eq.mockReturnThis()
    mockSupabaseInstance.insert.mockReturnThis()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should insert notification history and return 1 on success', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 0, error: null })))
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)
    
    expect(result).toBe(1)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('notification_history')
    expect(mockSupabaseInstance.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(mockSupabaseInstance.eq).toHaveBeenCalledWith('fingerprint', `user-1:budget:${new Date().toISOString().slice(0, 10)}`)
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should skip insert when the fingerprint was already sent today', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 1, error: null })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)
    
    expect(result).toBe(0)
    expect(mockSupabaseInstance.insert).not.toHaveBeenCalled()
  })

  it('should proceed to insert when the dedupe check fails', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 0, error: { code: '500', message: 'Server error' } })))
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)
    
    expect(result).toBe(1)
    expect(mockSupabaseInstance.insert).toHaveBeenCalled()
  })

  it('should return 0 on duplicate error (code 23505)', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 0, error: null })))
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: { code: '23505' } })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
  })

  it('should return 0 on other database errors', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 0, error: null })))
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: { code: '500', message: 'Server error' } })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
  })
})