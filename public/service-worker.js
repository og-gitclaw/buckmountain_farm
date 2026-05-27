/**
 * Buck Mountain Cannabis — service worker
 *
 * Handles browser push notifications fired by /api/notifications/new-product
 * via the web-push library.
 *
 * Registration happens client-side from /loyalty/claim/[token] (or the
 * post-consent page) after the user opts into push.
 *
 * Payload shape (must match what lib/push.ts sends):
 *   { title, body, url?, image?, tag? }
 */

self.addEventListener('install', (event) => {
  // Activate immediately so push works on first registration.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Buck Mountain', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Buck Mountain Cannabis';
  const options = {
    body: data.body || '',
    icon: data.icon || '/brand/logo.svg',
    badge: '/brand/logo.svg',
    image: data.image,
    tag: data.tag,                       // de-dupes if multiple sent
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Focus an existing tab if one is open on the same origin.
      for (const w of wins) {
        try {
          const u = new URL(w.url);
          if (u.origin === self.location.origin) {
            w.focus();
            return w.navigate(url);
          }
        } catch {}
      }
      return self.clients.openWindow(url);
    }),
  );
});
