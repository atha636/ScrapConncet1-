// Runs independently of any open tab — this is what lets a push notification
// arrive even if the app isn't open in the browser at all.

// A registered fetch handler (even a pure passthrough) is one of the signals
// Chrome uses to decide this is a real installable app, not just a page that
// happens to have a service worker for push. No caching/offline behavior is
// implemented here yet — every request just goes to the network as normal.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ScrapConnect", body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: { pickupId: payload.pickupId || null },
  };

  event.waitUntil(self.registration.showNotification(payload.title || "ScrapConnect", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});