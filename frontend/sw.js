// NextDate — service worker
// Lightweight cache so the app shell loads offline and qualifies as an
// installable PWA. Stale-while-revalidate for our own shell: cached
// response is served instantly while a network refresh happens in the
// background, so reloads paint immediately and new deploys roll out
// on the *next* visit (which the controllerchange auto-reload covers).

const VERSION = "nextdate-v5";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
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
    icon: payload.icon || "./icon-192.png",
    badge: payload.badge || "./icon-192.png",
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
    // Same SWR strategy for the navigation request itself — cached HTML
    // shell paints in the browser instantly, and the network response
    // refreshes the cache for the *next* load (controllerchange handles
    // the actual reload after deploys).
    event.respondWith(staleWhileRevalidate(req, "./index.html"));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});

// Stale-while-revalidate: serve the cached response immediately if we
// have one, while kicking off a network fetch in the background to
// refresh the cache. If there's no cache hit, fall through to the
// network. This makes reloads paint *instantly* instead of waiting on
// a network round trip for every shell asset.
function staleWhileRevalidate(req, fallback) {
  return caches.match(req).then((cached) => {
    const networkFetch = fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() => cached || (fallback ? caches.match(fallback) : undefined));
    return cached || networkFetch;
  });
}
