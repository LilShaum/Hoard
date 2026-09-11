/**
 * The app mark, and every file that has to carry it.
 *
 * The mark itself is still the hexagon from the first scaffold and is still
 * wrong — it says nothing about the app, and it survived a full visual pass
 * because nothing renders it on screen. An icon is only ever seen on a home
 * screen or a browser tab, neither of which a test suite looks at. Replacing
 * it is open work; what this file does now is make the replacement a one-place
 * change and fix the plumbing around it, which was broken independently of
 * what the drawing is.
 *
 * Three things were wrong underneath:
 *
 *  - **The page and the image could drift.** The PNG was written here and
 *    pasted into `index.html` by hand, so regenerating one without the other
 *    left the page carrying a previous mark. This script owns both now.
 *  - **There were no manifest icons at all**, so an Android install had
 *    nothing to use and fell back to a screenshot of the page.
 *  - **There was no maskable icon.** Android crops to a circle inscribed in
 *    the middle 80%; a full-bleed mark loses its edges to that crop, so the
 *    maskable variant is drawn inset.
 *
 *   node scripts/make-icon.mjs
 */
import { launch } from './browser.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const INK = '#131a17'   // --ink, light appearance

/* ------------------------------------------------------------------ the mark */

/**
 * Placeholder. A hexagon with a dot in it, in the default accent — the shape
 * the project was scaffolded with. Everything below this line is finished;
 * this is the part that is not.
 */
const ACCENT = '#234a6e'

/**
 * @param scale 1 is full-bleed. Below 1 the mark is inset about the centre,
 *   which is what a maskable icon needs.
 */
function mark({ plate = INK, ink = ACCENT, scale = 1 } = {}) {
  const body = `
    <path d="M50 14 L84 32 V68 L50 86 L16 68 V32 Z" fill="none" stroke="${ink}"
          stroke-width="7.2" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="11" fill="${ink}"/>`
  const inner = scale === 1
    ? body
    : `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${body}</g>`
  return `<rect width="100" height="100" fill="${plate}"/>${inner}`
}

/** The square is full-bleed because iOS applies its own squircle mask. */
const svg = (opts, radius = 0) => {
  const plate = opts?.plate ?? INK
  const clip = radius
    ? `<clipPath id="r"><rect width="100" height="100" rx="${radius}"/></clipPath>`
    : ''
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
    + (clip ? `<defs>${clip}</defs><g clip-path="url(#r)">` : '')
    + `<rect width="100" height="100" fill="${plate}"/>`
    + mark(opts).replace(/^<rect[^>]*\/>/, '')
    + (clip ? '</g>' : '')
    + '</svg>'
  // The favicon travels as a percent-encoded data URI, where every space costs
  // three characters.
  return out.replace(/>\s+</g, '><').replace(/\s+/g, ' ')
}

/* --------------------------------------------------------------- rendering */

const browser = await launch()

async function png(size, opts) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>`
    + svg(opts),
    { waitUntil: 'load' },
  )
  const out = await page.screenshot({ omitBackground: false })
  await page.close()
  return out
}

const apple = await png(180)
const any192 = await png(192)
const any512 = await png(512)
const maskable = await png(512, { scale: 0.68 })

await browser.close()

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', any192)
writeFileSync('public/icon-512.png', any512)
writeFileSync('public/icon-maskable-512.png', maskable)
writeFileSync('scripts/apple-touch-icon.b64', apple.toString('base64'))

/* ------------------------------------------------- inlining into the page */

const manifest = {
  name: 'Hoard',
  short_name: 'Hoard',
  description: 'A savings app that plays like a game',
  start_url: '.',
  display: 'standalone',
  background_color: '#e6eae3',
  theme_color: '#e6eae3',
  icons: [
    { src: './icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: './icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

/**
 * The manifest is a real file, not a data: URI like the other two. Icon `src`
 * values in a manifest resolve against the manifest's own URL, and a data:
 * URL has none — every relative path in it is unresolvable, so the icons would
 * be silently dropped and an Android install would fall back to a screenshot.
 * A file next to index.html resolves correctly under both `/` locally and
 * `/Hoard/` on Pages.
 */
writeFileSync('public/manifest.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`)

const FAVICON = `data:image/svg+xml,${encodeURIComponent(svg(undefined, 3))}`
const APPLE = `data:image/png;base64,${apple.toString('base64')}`
const MANIFEST = './manifest.webmanifest'

const swap = (html, selector, href) => {
  const re = new RegExp(`(<link rel="${selector}"[^>]*href=")[^"]*(")`)
  if (!re.test(html)) throw new Error(`no <link rel="${selector}"> to update in index.html`)
  return html.replace(re, `$1${href}$2`)
}

let html = readFileSync('index.html', 'utf8')
html = swap(html, 'icon', FAVICON)
html = swap(html, 'manifest', MANIFEST)
html = swap(html, 'apple-touch-icon', APPLE)
writeFileSync('index.html', html)

const kb = (b) => `${(b.length / 1024).toFixed(1)} KB`
console.log(`apple-touch-icon 180  ${kb(apple)}  (inlined into index.html)`)
console.log(`icon-192              ${kb(any192)}`)
console.log(`icon-512              ${kb(any512)}`)
console.log(`icon-maskable-512     ${kb(maskable)}`)
console.log(`favicon               ${(FAVICON.length / 1024).toFixed(1)} KB inline`)
