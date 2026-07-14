// Runs independently of any open tab — this is what lets a push notification
// arrive even if the app isn't open in the browser at all.

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

// Clicking the OS-level notification focuses an existing tab if one's open,
// otherwise opens a new one — never stacks duplicate tabs.
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