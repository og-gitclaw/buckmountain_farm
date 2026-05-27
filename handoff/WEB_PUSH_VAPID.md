# Web Push (VAPID) — buckmountain.farm

Native browser push notifications. Independent of Apple/Google
developer accounts, free, standards-based.

## Why both Web Push AND Alpine IQ SMS?

- **Alpine IQ SMS** = highest engagement, cellular delivery, but the
  user has to consent to text marketing (TCPA gate). Costs ~$0.01/msg.
- **Web Push** = lower friction, lives in the browser, $0 to send,
  but only fires if the user has the site open or the service worker
  registered. Useful for in-session nudges + browser-on-desktop users.

## Generate VAPID keys

```bash
npx web-push generate-vapid-keys

# Output:
# Public Key:  BPa...
# Private Key: x4...
```

Save both to Vercel env:

- `PUSH_VAPID_PUBLIC_KEY` = public
- `PUSH_VAPID_PRIVATE_KEY` = private
- `PUSH_VAPID_SUBJECT` = `mailto:support@buckmountain.farm`

## Client subscription flow

1. User checks the "Allow push notifications" box on `/auth/consent`.
2. Browser shows the native permission prompt.
3. Page registers `/service-worker.js`.
4. Page calls `registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: <PUSH_VAPID_PUBLIC_KEY>
   })`.
5. The returned `PushSubscription` object is POSTed to
   `/api/push/subscribe` (already wired).

## Server send flow (P3)

When `/api/notifications/new-product` fires:

```typescript
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.PUSH_VAPID_SUBJECT!,
  process.env.PUSH_VAPID_PUBLIC_KEY!,
  process.env.PUSH_VAPID_PRIVATE_KEY!,
);

for (const sub of activeSubscriptions) {
  await webpush.sendNotification(sub, JSON.stringify({
    title: "Permanent OG just landed",
    body: "Light-assist indoor — see batch + COA",
    url: "/strains/permanent-og",
  }));
}
```

Add `web-push` to package.json when wiring this — currently not a
dependency (stub returns `{ queued: 0 }` until wired).

## Service worker

The site needs a `public/service-worker.js` that handles the `push`
event and shows the notification. Bare minimum:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Buck Mountain', {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(clients.openWindow(url));
});
```

Drop into `public/service-worker.js` when ready.

## Browser support caveat

- Chrome/Edge/Firefox desktop + Android: works.
- Safari macOS: works (Safari 16+).
- iOS Safari: **only works if installed as a PWA**. Plain web Safari
  on iPhone won't deliver pushes. We mention this in the consent UI.
