/**
 * Renders the art sheet to shots/. Pass a stage index to focus one form:
 *   node scripts/artshot.mjs 3
 * Sections are captured separately so each can be looked at closely.
 */
import { chromium } from 'playwright'

const focus = process.argv[2] ?? '2'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 2 })
p.on('pageerror', (e) => console.log('ERR', e.message))
await p.goto(`http://127.0.0.1:5199/sandbox/index.html?focus=${focus}`, { waitUntil: 'networkidle' })
await p.waitForTimeout(600)

const shot = async (heading, file, scale) => {
  const el = p.locator(`h2:has-text("${heading}") + div`)
  if (!(await el.count())) return console.log('missing section', heading)
  await el.screenshot({ path: `shots/${file}`, scale })
}

await shot('Focus', 'art-focus.png')
await shot('The line — 128px', 'art-line.png')
await shot('The line in one accent', 'art-line-accent.png')
await shot('Small', 'art-small.png')
await shot('On dark', 'art-dark.png')
await p.screenshot({ path: 'shots/art-sheet.png', fullPage: true })
await b.close()
