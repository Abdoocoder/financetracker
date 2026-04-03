import { getMessaging } from 'firebase-admin/messaging'

describe('sendFCMNotification', () => {
  const fcmToken = 'mock-fcm-token'
  const title = 'Test Title'
  const body = 'Test Body'
  const url = 'http://localhost:3000/dashboard'

  let sendFCMNotification: any
  const mockMessaging = getMessaging()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    // Re-require the module so it picks up the fresh mocks
    sendFCMNotification = require('../../lib/firebase-admin').sendFCMNotification
  })

  it('should send a notification with the correct payload structure', async () => {
    (mockMessaging.send as jest.Mock).mockResolvedValue('success-id')

    const result = await sendFCMNotification(fcmToken, title, body, url, 10)

    expect(result).toBe(true)
    expect(mockMessaging.send).toHaveBeenCalledWith(expect.objectContaining({
      token: fcmToken,
      notification: { title, body },
      android: expect.objectContaining({
        notification: expect.objectContaining({
          notificationCount: 10
        })
      }),
      apns: expect.objectContaining({
        payload: {
          aps: {
            badge: 10,
            sound: 'default'
          }
        }
      })
    }))
  })

  it('should return false if sending fails', async () => {
    (mockMessaging.send as jest.Mock).mockRejectedValue(new Error('FCM Error'))

    const result = await sendFCMNotification(fcmToken, title, body, url)

    expect(result).toBe(false)
    expect(mockMessaging.send).toHaveBeenCalled()
  })

  it('should handle missing URL or badge by using defaults', async () => {
    (mockMessaging.send as jest.Mock).mockResolvedValue('id')

    await sendFCMNotification(fcmToken, title, body, url)

    const payload = (mockMessaging.send as jest.Mock).mock.calls[0][0]
    expect(payload.android.notification.notificationCount).toBe(0)
    expect(payload.apns.payload.aps.badge).toBe(0)
  })
})
