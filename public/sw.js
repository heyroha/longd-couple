// 서비스워커: 푸시 알림 표시 + 알림 누르면 앱 열기
// (오프라인 캐시는 일부러 안 함 → 수정 사항이 항상 바로 반영되도록)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || "💌 롱디's 월례 알림";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '새 의결서가 도착했어요!',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      tag: data.tag || 'kk-travel',
      renotify: true,
      data: { url: data.url || '/?view=history' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          client.postMessage({ type: 'open', url });
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
