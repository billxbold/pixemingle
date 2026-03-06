/**
 * Pixemingle Service Worker
 * Handles push notifications and notification click events.
 */

// Install — activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — claim clients so the SW controls pages right away
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — show notification from push payload
self.addEventListener('push', (event) => {
  let title = 'Pixemingle';
  let options = {
    body: 'Something happened in the pixel world!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {
        ...options,
        ...data,
        title: undefined, // title goes as first arg, not in options
      };
    } catch {
      // If payload isn't JSON, use text as body
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open or focus the app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/world';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
