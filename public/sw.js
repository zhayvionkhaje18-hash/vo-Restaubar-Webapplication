/// <reference lib="webworker" />

const CACHE_NAME = "lumiere-v1"
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-light-32x32.png",
  "/icon-dark-32x32.png",
  "/apple-icon.png",
]

// ─── Install: cache static assets ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─── Fetch: network-first for API, cache-first for static ───────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and browser-internal requests
  if (request.method !== "GET") return
  if (url.protocol === "chrome-extension:") return
  if (url.hostname !== self.location.hostname && !url.hostname.includes("supabase")) return

  // API / server actions → network only, no cache (always fresh data)
  if (
    url.pathname.startsWith("/_next/server") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/rest/") ||
    url.hostname.includes("supabase")
  ) {
    return
  }

  // Static assets / Next.js pages → stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => {
            // Network failed — return cached version if available
            return cached || new Response("Offline", { status: 503 })
          })

        // Use cached immediately if available, otherwise wait for network
        return cached || fetchPromise
      })
    )
  )
})

// ─── Push notifications (future-ready) ──────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Lumière", {
      body: data.body,
      icon: "/icon.svg",
      badge: "/icon-light-32x32.png",
      tag: data.tag ?? "default",
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url))
  }
})