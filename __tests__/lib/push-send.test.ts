import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Global-ish mock object for this file
const mockSupabaseInstance = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  then: jest.fn(),
}

// Mock Supabase locally with a factory that returns the SAME instance
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseInstance)
}))

// Mock firebase-admin
jest.mock('../../lib/firebase-admin', () => ({
  sendFCMNotification: jest.fn(() => Promise.resolve(true))
}))

import { sendPushToUser } from '../../lib/push-send'

describe('sendPushToUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    
    // Default mock behavior for chainable methods
    mockSupabaseInstance.from.mockReturnThis()
    mockSupabaseInstance.select.mockReturnThis()
    mockSupabaseInstance.eq.mockReturnThis()
    mockSupabaseInstance.insert.mockReturnThis()
    mockSupabaseInstance.delete.mockReturnThis()
  })

  it('should return 0 if no subscriptions found', async () => {
    // 1. Mock subscriptions (empty)
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ data: [], error: null })))
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('should send FCM notification correctly', async () => {
    // 1. Mock subscriptions (one FCM)
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ 
      data: [{ id: 1, endpoint: 'fcm:mock-token', user_id: 'user-1' }], 
      error: null 
    })))
    // 2. Mock unread count
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 5, error: null })))
    // 3. Mock direct insert for alert record (if sent > 0)
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(1)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('alerts')
  })

  it('should send Web Push notification correctly', async () => {
    // 1. Mock subscriptions (one Web Push)
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ 
      data: [{ id: 2, endpoint: 'https://push.com', p256dh: 'dh', auth: 'auth', user_id: 'user-1' }], 
      error: null 
    })))
    // 2. Mock unread count
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 2, error: null })))
    // 3. Mock insert for alert record
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))
    
    const sendSpy = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({} as any)

    const result = await sendPushToUser('user-1', 'Web Title', 'Web Msg', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(1)
    expect(sendSpy).toHaveBeenCalled()
  })

  it('should clean up stale subscriptions on 410 error', async () => {
    // 1. Mock subscriptions
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ 
      data: [{ id: 3, endpoint: 'https://stale.com', user_id: 'user-1' }], 
      error: null 
    })))
    // 2. Mock unread count
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ count: 0, error: null })))
    
    jest.spyOn(webpush, 'sendNotification').mockRejectedValue({ statusCode: 410 })
    
    // 3. Mock delete call inside catch
    mockSupabaseInstance.then.mockImplementationOnce(fn => Promise.resolve(fn({ error: null })))
    // 4. (sent is 0, so no insert call)

    const result = await sendPushToUser('user-1', 'Stale', 'Msg', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.delete).toHaveBeenCalled()
  })
})
