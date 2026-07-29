// Runs independently of any open tab — this is what lets a push notification
// arrive even if the app isn't open in the browser at all.

// Bump this on any change to the caching strategy below — the activate
// handler uses it to throw away stale caches from a previous version of
// this file, so users don't get stuck on old logic forever.
const CACHE_VERSION = "v1";
const CACHE_NAME = `scrapconnect-${CACHE_VERSION}`;

// Vite's JS/CSS chunk filenames are content-hashed and change every build,
// so there's no fixed list to precache reliably without build-time tooling
// (vite-plugin-pwa) we don't have wired up. Only these have stable, known
// names — everything else is cached as it's actually requested (below).
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept mutations — a POST/PATCH/DELETE served from cache would
  // be silently wrong, not just stale. Let the browser handle these (and
  // any failure) exactly as if this service worker didn't exist.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Socket.io's polling-transport fallback issues plain GET requests here —
  // these must always hit the network live, never be served from cache,
  // or chat/live pickup updates could silently go stale.
  if (url.pathname.startsWith("/socket.io/")) return;

  // Page navigations (typing the URL, refreshing, following a link): try
  // the network first for the freshest app shell, but fall back to the
  // cached "/" if offline — React Router then renders the right route
  // client-side once the shell loads, so a refresh on e.g. /collector
  // still works without a network connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/"))
    );
    return;
  }

  // API calls: network-first. A GET (e.g. viewing available pickups) falls
  // back to its last cached response when offline, so the last-known list
  // still renders instead of a blank error state. Never cached for
  // anything auth-sensitive by way of not caching non-GET at all (above).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else (JS/CSS chunks, images, fonts, icons): stale-while-
  // revalidate. Serve the cached version immediately if we have one — for
  // content-hashed build assets a cache hit is always correct, since a new
  // deploy means a new filename, never stale content under the old one —
  // while updating the cache in the background for next time.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});

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