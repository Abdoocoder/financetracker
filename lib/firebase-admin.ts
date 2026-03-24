import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  url: string
): Promise<boolean> {
  try {
    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icon-192.png',
          badge: '/icon-96.png',
          click_action: url,
        },
        fcmOptions: { link: url },
      },
      data: { url: String(url), title: String(title), message: String(body) },
      android: {
        priority: 'high',
        notification: {
          title,
          body,
          icon: 'ic_notification',
          clickAction: url,
          channelId: 'fajrak_notifications',
        },
      },
    })
    return true
  } catch (err: any) {
    console.error('FCM send error:', JSON.stringify(err?.message || err))
    return false
  }
}
