import { chromium } from 'playwright'
const url = process.argv[2]
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
const errs = []
p.on('pageerror', e => errs.push('pageerror: ' + e.message))
p.on('requestfailed', r => errs.push('failed: ' + r.url()))
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) })
await p.goto(url, { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const onboard = await p.locator('.onboard').count()
const title = await p.title()
console.log('title:', title, '| onboarding rendered:', onboard === 1)
// Walk a route to prove hash routing survives the sub-path.
await p.getByRole('button', { name: 'See a demo instead' }).click()
await p.waitForTimeout(3000)
await p.goto(url + '#/progress', { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
console.log('charts on /progress:', await p.locator('.chart__svg').count())
console.log('font loaded:', await p.evaluate(() => document.fonts.check('16px Archivo')))
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors')
await b.close()
