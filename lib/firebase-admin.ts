import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: 'fajrak-f7df1',
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
    await admin.messaging().send({
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
      data: { url, title, message: body },
    })
    return true
  } catch (err) {
    console.error('FCM send error:', err)
    return false
  }
}
