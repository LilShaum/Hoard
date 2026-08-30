/**
 * Screenshot every screen of a running app, at phone size, so they can be
 * looked at rather than reasoned about.
 *
 * The point of this script is the second pass. Reviewing a populated account
 * finds layout problems; reviewing a *brand-new* account finds the empty
 * states that swallow the screen, the "you are behind" copy aimed at someone
 * who has done nothing yet, and the primary button still wearing placeholder
 * text. Almost nobody runs that pass, so that is where the findings are.
 *
 *   node screens.mjs --base http://127.0.0.1:4173/ --routes home,vaults,profile
 *   node screens.mjs --base ... --routes ... --setup ./demo-setup.mjs --tag demo
 *
 * --setup points at a module exporting `default async (page, base) => {}`,
 * run once after the first load. Use it to click through onboarding, load a
 * demo fixture, or seed localStorage — whatever puts the app in the state you
 * want to review. Run it twice with two different setups to get both passes.
 *
 * Routes are hash routes by default (`#/home`); pass --path for path routing.
 *
 * Copy this into your project (e.g. scripts/) and run it from there — the
 * `playwright` import resolves from this file's own location, so it needs to
 * sit inside the project that has Playwright installed.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const base = arg('base', 'http://127.0.0.1:4173/')
const routes = arg('routes', '').split(',').map((r) => r.trim()).filter(Boolean)
const outDir = resolve(arg('out', 'shots'))
const tag = arg('tag', '')
const setupPath = arg('setup')
const usePath = flag('path')
const width = Number(arg('width', 390))
const height = Number(arg('height', 844))

if (routes.length === 0) {
  console.error('Pass --routes home,vaults,profile (comma separated)')
  process.exit(1)
}

await mkdir(outDir, { recursive: true })

// A sandbox may ship its own browser; fall back to whatever Playwright found.
const SANDBOX = '/opt/pw-browsers/chromium'
const { existsSync } = await import('node:fs')
const browser = await chromium.launch(
  existsSync(SANDBOX) ? { executablePath: SANDBOX } : {},
)

const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
})
const page = await ctx.newPage()

// Page errors are worth knowing about even on a screenshot run — a screen that
// renders "fine" while throwing is a screen you are about to misjudge.
page.on('pageerror', (e) => console.log('  PAGEERROR', e.message))

await page.goto(base, { waitUntil: 'networkidle' })
await page.evaluate(() => { try { localStorage.clear() } catch {} })
await page.goto(base, { waitUntil: 'networkidle' })

if (setupPath) {
  const mod = await import(resolve(setupPath))
  await (mod.default ?? mod)(page, base)
}

/**
 * Celebrations are the app working, not the app breaking — but a modal will
 * happily sit over the screen you came to photograph.
 */
const clearOverlays = async () => {
  for (let i = 0; i < 8; i++) {
    if ((await page.locator('.overlay, [role="dialog"]').count()) === 0) return
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
}

for (const route of routes) {
  const url = usePath ? `${base.replace(/\/$/, '')}/${route}` : `${base}#/${route}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await clearOverlays()
  await page.waitForTimeout(700)
  const name = `${tag ? `${tag}-` : ''}${route}.png`
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: true })
  console.log('shot', name)
}

await browser.close()
console.log(`\nWritten to ${outDir}. Now open the images and look at them.`)
