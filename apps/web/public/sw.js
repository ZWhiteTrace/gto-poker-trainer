// GTO Poker Trainer Service Worker
// Bump CACHE_VERSION when changing PRECACHE_URLS or caching strategy
const CACHE_VERSION = 3;
const CACHE_NAME = `grindgto-v${CACHE_VERSION}`;
const STATIC_CACHE = `grindgto-static-v${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Files to cache immediately for offline access
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  // Core drill pages
  "/drill/rfi",
  "/drill/flop-texture",
  "/drill/push-fold",
  "/range",
  "/mtt/push-fold",
  // Exam page
  "/exam",
  "/stats",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper: Check if URL is a static asset
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)(\?.*)?$/i.test(url);
}

// Helper: Check if URL is a Next.js data request
function isNextDataRequest(url) {
  return url.includes("/_next/data/") || url.includes(".json");
}

// Fetch event - smart caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) return;

  // Skip Supabase API requests
  if (url.includes("supabase.co")) return;

  // Skip internal Next.js API routes
  if (url.includes("/api/")) return;

  // Static assets: Cache-first strategy
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Refresh cache in background
            fetch(request)
              .then((response) => {
                if (response.ok) cache.put(request, response.clone());
              })
              .catch(() => {});
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => new Response("", { status: 503 }));
        });
      })
    );
    return;
  }

  // Navigation requests: Network-first, cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Next.js data and other requests: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        });
      })
  );
});

// Message handler for manual cache updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
