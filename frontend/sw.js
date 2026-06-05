// NextDate — service worker
// Lightweight cache so the app shell loads offline and qualifies as an
// installable PWA. Network-first for everything we own so deploys roll
// out on the next refresh; the cache is only a fallback for offline.

const VERSION = "nextdate-v3";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Notifications ──
// Clicking a system notification focuses an existing app tab (and tells
// it which view to open) or pops one open if none exist. The `push`
// handler is wired up too so that, once the backend learns to send
// VAPID-signed Web Push messages, no frontend change is needed.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const sameOrigin = all.filter((c) => c.url.startsWith(self.location.origin));
    if (sameOrigin.length) {
      const client = sameOrigin[0];
      try { await client.focus(); } catch {}
      client.postMessage({ type: "nd-notif-click", data });
      return;
    }
    await self.clients.openWindow(data.url || "./");
  })());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { title: event.data?.text?.() || "NextDate" }; }
  const title = payload.title || "NextDate";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "./icon.svg",
    badge: payload.badge || "./icon.svg",
    tag: payload.tag,
    data: payload.data || {},
    vibrate: [60, 30, 60],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin; let Supabase, fonts, esm.sh hit the network.
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("./index.html").then((r) => r || caches.match(req))
      )
    );
    return;
  }

  // Network-first for our shell assets. We always try the live response
  // so style/JS deploys take effect on the next refresh; the cache is
  // only consulted when the network actually fails (offline).
  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(req))
  );
});
