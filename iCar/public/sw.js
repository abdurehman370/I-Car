self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = { title: 'iCar', body: 'You have a new notification', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/logo/logo.svg',
      badge: '/images/logo/logo.svg',
      tag: data.tag || 'icar-notification',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus().then((focused) => {
            if (focused && 'navigate' in focused) {
              return focused.navigate(url);
            }
            return undefined;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
