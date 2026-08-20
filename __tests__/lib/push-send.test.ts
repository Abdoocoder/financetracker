import webpush from 'web-push'

const mockSupabaseInstance = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  then: jest.fn(),
}

jest.mock('../../lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseInstance)
}))

import { sendPushToUser } from '../../lib/push-send'

describe('sendPushToUser', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    mockSupabaseInstance.from.mockReturnThis()
    mockSupabaseInstance.insert.mockReturnThis()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should insert notification history and return 1 on success', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', '/dashboard', 'budget', mockSupabaseInstance)
    
    expect(result).toBe(1)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('notification_history')
  })

  it('should return 0 on duplicate error (code 23505)', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: { code: '23505' } })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
  })

  it('should return 0 on other database errors', async () => {
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: { code: '500', message: 'Server error' } })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
  })
})
