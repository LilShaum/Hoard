/**
 * Hoard's service worker.
 *
 * Hoard is installed to a home screen and every byte of a person's savings
 * history lives in localStorage on that same phone. Without this file the app
 * still needed a live connection to *boot* — so a tunnel, a plane, or one bar
 * of signal meant a blank screen in front of data that was already on the
 * device. That is the failure this exists to prevent.
 *
 * PRECACHE and VERSION are injected at build time by the plugin in
 * vite.config.ts, which knows the content-hashed filenames Rollup produced.
 * Relative URLs here resolve against this script's own location, so the same
 * output works from a domain root and from the /Hoard/ sub-path Pages serves,
 * with no build-time knowledge of which.
 */
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const CACHE = `hoard-${VERSION}`
const SHELL = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // `reload` bypasses the HTTP cache, so an install never bakes in a
      // stale copy of something the browser happened to be holding.
      await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
      // Every asset is content-hashed and the app is a single bundle with no
      // dynamic imports, so nothing in a running session can go looking for a
      // chunk this version dropped. That makes taking over immediately safe,
      // and it means an update lands on the next launch rather than whenever
      // the last tab happens to close.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k.startsWith('hoard-') && k !== CACHE).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  // The document goes to the network first so a deploy is picked up on the
  // next launch; the cached shell is the fallback when there is no network.
  // Routing is hash-based, so every route is this one document.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE)
          cache.put(SHELL, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(SHELL)
          if (cached) return cached
          throw new Error('offline and no cached shell')
        }
      })(),
    )
    return
  }

  // Assets carry a content hash in the filename, so a hit is never stale:
  // a changed file is a different URL and misses into the network branch.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const fresh = await fetch(request)
      if (fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE)
        cache.put(request, fresh.clone())
      }
      return fresh
    })(),
  )
})
