/* Drives the built app in a real browser and writes screenshots for review. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4173'
const OUT = process.env.OUT ?? 'shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

const shot = async (name) => {
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

const seed = async (mode) => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.evaluate((m) => {
    localStorage.clear()
    if (m === 'demo') localStorage.setItem('__seed_demo', '1')
  }, mode)
}

// 1. Onboarding, straight out of the box.
await seed('fresh')
await page.reload({ waitUntil: 'networkidle' })
await shot('01-onboarding')
await page.getByPlaceholder('Optional').fill('Alex')
await page.getByRole('button', { name: 'Next' }).click()
await shot('02-currency')
await page.getByRole('button', { name: 'Next' }).click()
await shot('03-vault')
await page.getByRole('button', { name: 'Next' }).click()
await shot('04-monthly')
await page.getByRole('button', { name: 'Start my hoard' }).click()
await shot('05-home-fresh')

// 2. The demo hoard: the app as it looks lived-in.
await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Load demo data' }).click()
await page.getByRole('button', { name: 'Load it' }).click()
await page.waitForTimeout(3200)
// Dismiss anything the load celebrated with.
for (let i = 0; i < 3; i++) {
  const keep = page.getByRole('button', { name: 'Keep going' })
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(300) }
}
await page.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
await shot('06-home-demo')

await page.getByRole('button', { name: 'Save something' }).click()
await shot('07-save-sheet')
await page.keyboard.press('Escape')

await page.goto(`${BASE}#/vaults`, { waitUntil: 'networkidle' })
await shot('08-vaults')

const firstVault = page.locator('.vaultcard').first()
await firstVault.click()
await page.waitForTimeout(600)
await shot('09-vault-detail')
await page.evaluate(() => window.scrollTo(0, 99999))
await page.locator('.app__scroll').evaluate((el) => el.scrollTo(0, 700))
await shot('10-vault-pace')

await page.goto(`${BASE}#/quests`, { waitUntil: 'networkidle' })
await shot('11-quests')

await page.goto(`${BASE}#/progress`, { waitUntil: 'networkidle' })
await shot('12-progress')
await page.locator('.app__scroll').evaluate((el) => el.scrollTo(0, 800))
await shot('13-progress-charts')
await page.locator('.app__scroll').evaluate((el) => el.scrollTo(0, 1800))
await shot('14-achievements')

await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
await shot('15-profile')

// 2b. A couple of unlocked themes, to prove the token swap.
for (const [i, name] of [[4, 'royal'], [7, 'aurum']]) {
  await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
  const opt = page.locator('.themeopt:not(.is-locked)').nth(i)
  if (await opt.count()) {
    await opt.click()
    await page.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
    await shot(`18-theme-${name}`)
  }
}
await page.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
await page.locator('.themeopt:not(.is-locked)').first().click()

// 3. Desktop width — same page, so the demo data is still loaded.
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/16-desktop.png` })
await page.goto(`${BASE}#/progress`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/17-desktop-progress.png` })

await browser.close()

if (errors.length) {
  console.error('\nRUNTIME ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nno runtime errors')
