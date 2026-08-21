import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 })
p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('http://127.0.0.1:5199/sandbox/index.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
await p.screenshot({ path: 'shots/art-sheet.png', fullPage: true })
await b.close()
