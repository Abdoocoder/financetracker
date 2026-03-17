import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'

const FajrakPlugin = registerPlugin('Fajrak')

export async function syncSessionToNative(token: string, userId: string) {
  if (!Capacitor.isNativePlatform()) return
  try {
    await (FajrakPlugin as any).saveSession({ token, userId })
    // بعدها اقرأ FCM token وأرسله لـ Supabase
    const { token: fcmToken } = await (FajrakPlugin as any).getFCMToken()
    if (fcmToken) {
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fcmToken, type: 'fcm' })
      })
    }
  } catch (e) {
    console.log('Bridge error:', e)
  }
}
