importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyBPk_y0RKpYsWe31u_oksx6G6woOhj3Ypw",
  authDomain: "fajrak-f7df1.firebaseapp.com",
  projectId: "fajrak-f7df1",
  storageBucket: "fajrak-f7df1.firebasestorage.app",
  messagingSenderId: "621650342599",
  appId: "1:621650342599:web:48c4fa949ef940c4b844e2"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(function(payload) {
  const { title, body, url } = payload.data || payload.notification || {}
  self.registration.showNotification(title || 'Fajrak', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: { url: url || '/dashboard/alerts' },
    vibrate: [200, 100, 200],
  })
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data?.url || 'https://fajrak.com/dashboard/alerts'
  event.waitUntil(clients.openWindow(url))
})
