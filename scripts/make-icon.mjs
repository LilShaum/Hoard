/**
 * Renders the app mark to a 180x180 PNG for `apple-touch-icon`.
 *
 * iOS will not use an SVG here, and without a PNG it falls back to a
 * screenshot of the page — which makes a home-screen install look broken. The
 * square is drawn full-bleed because iOS applies its own squircle mask.
 */
import { launch } from './browser.mjs'
import { writeFileSync } from 'node:fs'

const INK = '#131a17'
const ACCENT = '#234a6e'
const SIZE = 180

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${INK}"/>
  <path d="M90 26 L152 58 V122 L90 154 L28 122 V58 Z"
        fill="none" stroke="${ACCENT}" stroke-width="13" stroke-linejoin="round"/>
  <circle cx="90" cy="90" r="20" fill="${ACCENT}"/>
</svg>`

const browser = await launch()
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
await page.setContent(
  `<style>html,body{margin:0;padding:0;background:${INK}}svg{display:block}</style>${svg}`,
  { waitUntil: 'load' },
)
const png = await page.screenshot({ omitBackground: false })
await browser.close()

writeFileSync('scripts/apple-touch-icon.b64', png.toString('base64'))
console.log(`apple-touch-icon: ${(png.length / 1024).toFixed(1)} KB`)
