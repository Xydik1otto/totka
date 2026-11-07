// Service Worker Тотки: cache-first, повний офлайн після першого відкриття
const V = "totka-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./core.js",
  "./icon-180.png",
  "./icon.png",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(V).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((r) => {
            if (r.ok && new URL(e.request.url).origin === self.location.origin) {
              const cl = r.clone();
              caches.open(V).then((c) => c.put(e.request, cl));
            }
            return r;
          })
          .catch(() => caches.match("./index.html"))
    )
  );
});
