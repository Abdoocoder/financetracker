self.addEventListener('push', function(event) {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'finance-alert',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard/alerts' },
    actions: [
      { action: 'open', title: '📊 فتح التطبيق' },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/dashboard/alerts';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
