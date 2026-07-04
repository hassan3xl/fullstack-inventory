const CACHE_NAME = "qstack-offline-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/pos",
  "/products",
  "/categories",
  "/customers",
  "/sales",
  "/dashboard",
  "/default_product.png",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => {
        console.warn("Service worker install cache failed:", err);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/sync/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname.includes("/_next/webpack-hmr")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            url.origin === location.origin
          ) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.headers.get("accept")?.includes("text/html")) {
            return (
              caches.match("/") ||
              caches.match("/pos") ||
              caches.match("/dashboard")
            );
          }
          return null;
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
