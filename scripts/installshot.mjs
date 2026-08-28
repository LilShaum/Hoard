import { devices } from 'playwright'
import { launch } from './browser.mjs'
const BASE = 'http://127.0.0.1:4173'
const b = await launch()

// A real iPhone profile: iOS user agent, touch points, mobile viewport.
const iphone = await b.newContext({ ...devices['iPhone 13'] })
const p = await iphone.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto(BASE, { waitUntil: 'networkidle' })
await p.evaluate(() => localStorage.clear())
await p.reload({ waitUntil: 'networkidle' })
await p.waitForTimeout(700)
await p.screenshot({ path: 'shots/i01-install-ios.png' })
console.log('title:', await p.locator('.onboard__title').innerText())
console.log('steps:', await p.locator('.installstep').count())
console.log('note :', (await p.locator('.installnote').innerText()).slice(0, 90))
console.log('notches:', await p.locator('.notch__cell').count())

// Same app, but running as an installed home-screen app.
const installed = await b.newContext({
  ...devices['iPhone 13'],
  // navigator.standalone is what iOS sets inside a Home Screen app.
})
const q = await installed.newPage()
await q.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }))
await q.goto(BASE, { waitUntil: 'networkidle' })
await q.evaluate(() => localStorage.clear())
await q.reload({ waitUntil: 'networkidle' })
await q.waitForTimeout(700)
console.log('\ninstalled -> first title:', await q.locator('.onboard__title').innerText())
console.log('installed -> notches   :', await q.locator('.notch__cell').count())
console.log('installed -> install steps shown:', await q.locator('.installstep').count())
await q.screenshot({ path: 'shots/i02-installed-first.png' })

console.log(errs.length ? '\nERRORS: ' + errs.join('; ') : '\nno runtime errors')
await b.close()
