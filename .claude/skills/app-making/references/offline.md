# Making an installed app open without a connection

Read this when adding offline support to a web app or PWA. It is the working
shape of the service worker described in SKILL.md §4, plus the traps that cost
the most time.

## Why the strategy is split

Two requirements pull in opposite directions:

- **It must open offline.** So something has to be cached.
- **A deploy must still reach people.** So the cache can't be authoritative.

Resolve it by treating the two kinds of request differently:

- **The document → network-first.** When there's a connection you get the
  newest HTML, which references the newest asset filenames. Offline, you fall
  back to the cached shell. This is what makes an update land on the next
  launch rather than whenever the last tab happens to close.
- **Content-hashed assets → cache-first.** A changed file is a *different URL*,
  so a cache hit can never be stale. This is the whole reason hashed filenames
  exist and it makes the fast path safe.

Delete old caches on `activate`. Without that they accumulate on every deploy
and eat the same storage budget the app's own data lives in — which, for an
app whose data is local-only, can mean the cache evicts the user's records.

## The worker

`PRECACHE` and `VERSION` are injected at build time. Relative URLs resolve
against the worker's own location, so the same output works from a domain root
and from a `/repo/` sub-path with no build-time knowledge of which.

```js
const VERSION = '__VERSION__'
const PRECACHE = __PRECACHE__
const CACHE = `app-${VERSION}`
const SHELL = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    // `reload` bypasses the HTTP cache so an install never bakes in a stale
    // copy the browser happened to be holding.
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys.filter((k) => k.startsWith('app-') && k !== CACHE).map((k) => caches.delete(k)),
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request)
        ;(await caches.open(CACHE)).put(SHELL, fresh.clone())
        return fresh
      } catch {
        const cached = await caches.match(SHELL)
        if (cached) return cached
        throw new Error('offline and no cached shell')
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const fresh = await fetch(request)
    if (fresh.ok && fresh.type === 'basic') {
      ;(await caches.open(CACHE)).put(request, fresh.clone())
    }
    return fresh
  })())
})
```

### On `skipWaiting`

Taking over immediately is safe when the app is a single bundle with no
dynamic imports — nothing in a running session can go looking for a chunk this
version dropped. If the app **does** code-split, either keep the previous
cache alive for a grace period or drop `skipWaiting()` and let the new worker
activate when the last client closes. Decide deliberately rather than copying
the line.

## Injecting the manifest at build time

Generate the worker *after* the build is written, so the precache list is a
listing of real files rather than a guess at the bundle's shape. Deriving the
version from that listing means any content change rotates the cache key.

```js
// Vite plugin — same idea in any bundler's post-build hook.
function serviceWorker() {
  let config
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(resolved) { config = resolved },
    closeBundle() {
      const outDir = join(config.root, config.build.outDir)
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => f !== 'sw.js')   // never precache a previous build's worker
        .sort()
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)
      const source = readFileSync(join(config.root, 'sw-template.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files.map((f) => `./${f}`), null, 2))
      writeFileSync(join(outDir, 'sw.js'), source)
    },
  }
}
```

## Registering it

```ts
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return              // sw.js is a build output
  if (!('serviceWorker' in navigator)) return

  // Resolved against the document, because the base path may be '/' locally
  // and '/repo/' in production. Relative resolution drops the hash route and
  // lands on the directory the app is served from — also the scope needed.
  const url = new URL('sw.js', document.baseURI)
  if (url.origin !== window.location.origin) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url, { scope: './' }).catch(() => {
      /* An app that cannot cache is still an app. */
    })
  })
}
```

Registration stays quiet on failure. A browser that refuses — no support, an
insecure origin, storage blocked in a private window — should still get an app
that works exactly as it did before.

## Verify all three

Do not assume any of these; each has failed in practice.

```js
// 1. An offline cold launch renders, with data intact.
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.evaluate(() => navigator.serviceWorker.ready)
await ctx.setOffline(true)
const cold = await ctx.newPage()
await cold.goto(BASE)                       // must not throw
assert.ok((await cold.locator('body').innerText()).trim())

// 2. A new deploy lands on one reload, online.
//    Rebuild with a detectable marker, reload, assert the marker is present
//    and the asset filename changed.

// 3. Exactly one cache remains after an update settles.
//    Give activation a couple of seconds — checking too early shows two and
//    looks like a leak that isn't there.
assert.equal((await page.evaluate(() => caches.keys())).length, 1)
```

## Waiting on the worker in tests

`navigator.serviceWorker.ready` never resolves if no worker registers, which
turns a failing assertion into a hung job that burns the full CI timeout.
Race it against a deadline **inside the page** so the failure is fast and
says why:

```js
const ready = await page.evaluate(() => Promise.race([
  navigator.serviceWorker.ready.then(() => true),
  new Promise((r) => setTimeout(() => r(false), 15000)),
]))
assert.ok(ready, 'no service worker took control, so the app cannot open offline')
```

Note that `page.evaluate`'s second argument is the *argument to the function*,
not a timeout option — passing `{ timeout: 15000 }` there does nothing and is
an easy way to write exactly the hang described above.

## Secure context

Service workers require HTTPS, `localhost`, or `127.0.0.1`. Production Pages
and local preview both qualify; a `file://` build does not.
