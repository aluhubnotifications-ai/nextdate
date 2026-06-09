// NextDate — service worker
// Stale-while-revalidate for our own shell so reloads paint instantly.
// Designed to fail safe: a missing or 404'ing asset during install
// doesn't poison the cache; the fetch handler always falls back to
// network so the page can still load even if the cache is empty.

const VERSION = "nextdate-v7";
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
  // Pre-cache each shell asset INDIVIDUALLY so a single 404 (e.g. a
  // newly-added icon that hasn't propagated to the CDN yet) doesn't
  // make addAll throw and leave the entire cache empty. Anything that
  // fails here will just be cached on its first runtime fetch.
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      await Promise.all(SHELL.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: "reload" });
          if (resp && resp.ok) await cache.put(url, resp);
        } catch { /* asset will be cached on first runtime fetch */ }
      }));
    }).catch(() => {})
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
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(req, "./index.html"));
    return;
  }
  event.respondWith(staleWhileRevalidate(req));
});

// Stale-while-revalidate. Serve the cached response immediately if we
// have one, while kicking off a background fetch to refresh the cache.
// Critically: this function NEVER resolves to undefined. If both the
// cache and the network fail, we return a synthetic offline response
// so the browser doesn't get back nothing (which on iOS Safari shows
// as a permanent blank page until the user clears site data).
function staleWhileRevalidate(req, fallback) {
  return caches.open(VERSION).then((cache) =>
    cache.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            try { cache.put(req, resp.clone()); } catch { /* noop */ }
          }
          return resp;
        })
        .catch(async () => {
          // Network errored. Try the cache, then the navigation fallback.
          if (cached) return cached;
          if (fallback) {
            const fb = await cache.match(fallback);
            if (fb) return fb;
          }
          // Last resort — never return undefined; respond with a 503 so
          // the browser shows its own offline UI instead of just hanging.
          return new Response(
            "Offline — pull down to refresh once you have a connection.",
            { status: 503, statusText: "Offline", headers: { "Content-Type": "text/plain" } }
          );
        });
      return cached || networkFetch;
    })
  );
}
