import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Global-ish mock object for this file
const mockSupabaseInstance = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
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
    
    // Default mock behavior for chaining
    // Note: Since Supabase methods are thenable, we can just mock the leaf nodes as resolved promises
    ;(mockSupabaseInstance.eq as jest.Mock).mockReturnThis()
    ;(mockSupabaseInstance.insert as jest.Mock).mockResolvedValue({ error: null })
  })

  it('should return 0 if no subscriptions found', async () => {
    // mockSupabaseInstance is thenable via its methods returning this, 
    // but the final await needs a resolution.
    // Instead of mocking 'then', we mock the last method in the chain to return a Promise.
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ data: [], error: null })
    
    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)
    
    expect(result).toBe(0)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('should send FCM notification correctly', async () => {
    // 1. Mock subscriptions (one FCM)
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ 
      data: [{ id: 1, endpoint: 'fcm:mock-token', user_id: 'user-1' }], 
      error: null 
    })
    // 2. Mock unread count
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ count: 5, error: null })
    // 3. Mock direct insert for alert record
    ;(mockSupabaseInstance.insert as jest.Mock).mockResolvedValueOnce({ error: null })

    const result = await sendPushToUser('user-1', 'Title', 'Message', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(1)
    expect(mockSupabaseInstance.from).toHaveBeenCalledWith('alerts')
  })

  it('should send Web Push notification correctly', async () => {
    // 1. Mock subscriptions (one Web Push)
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ 
      data: [{ id: 2, endpoint: 'https://push.com', p256dh: 'dh', auth: 'auth', user_id: 'user-1' }], 
      error: null 
    })
    // 2. Mock unread count
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ count: 2, error: null })
    
    const sendSpy = jest.spyOn(webpush, 'sendNotification').mockResolvedValue({} as any)

    const result = await sendPushToUser('user-1', 'Web Title', 'Web Msg', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(1)
    expect(sendSpy).toHaveBeenCalled()
  })

  it('should clean up stale subscriptions on 410 error', async () => {
    // 1. Mock subscriptions
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ 
      data: [{ id: 3, endpoint: 'https://stale.com', user_id: 'user-1' }], 
      error: null 
    })
    // 2. Mock unread count
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ count: 0, error: null })
    
    jest.spyOn(webpush, 'sendNotification').mockRejectedValue({ statusCode: 410 })
    
    // 3. Mock delete call (the eq after delete)
    ;(mockSupabaseInstance.eq as jest.Mock).mockResolvedValueOnce({ error: null })

    const result = await sendPushToUser('user-1', 'Stale', 'Msg', undefined, undefined, mockSupabaseInstance)

    expect(result).toBe(0)
    expect(mockSupabaseInstance.delete).toHaveBeenCalled()
  })
})
