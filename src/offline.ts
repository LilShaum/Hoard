/**
 * Registers the service worker that lets Hoard open without a connection.
 *
 * Only in a production build: `sw.js` is emitted by the build, so there is
 * nothing to register from a dev server. Registration is deliberately quiet —
 * offline support is a bonus on top of a working app, and a browser that
 * refuses it (no support, an insecure origin, storage blocked in a private
 * window) should still get an app that works exactly as it did before.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  // Resolved against the document rather than hardcoded, because `base` is
  // './' for the portable build and '/Hoard/' on Pages. Relative resolution
  // drops the hash route and lands on the directory the app is served from,
  // which is also the scope the worker needs.
  const url = new URL('sw.js', document.baseURI)
  if (url.origin !== window.location.origin) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(url, { scope: './' }).catch(() => {
      /* An app that cannot cache is still an app. */
    })
  })
}
