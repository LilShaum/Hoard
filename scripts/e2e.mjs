/**
 * End-to-end smoke test against the real built app in a real browser.
 * The unit suite proves the engine; this proves the thing people touch.
 */
import { devices } from 'playwright'
import { launch } from './browser.mjs'
import assert from 'node:assert/strict'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const browser = await launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.setDefaultTimeout(6000)

const failures = []
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !/favicon|404/.test(t)) failures.push(`console: ${t}`)
})

let passed = 0
const check = async (name, fn) => {
  try {
    await fn()
    passed++
    console.log(`  ok   ${name}`)
  } catch (err) {
    failures.push(`${name}: ${err.message.split('\n')[0]}`)
    console.log(`  FAIL ${name}\n       ${err.message.split('\n')[0]}`)
  }
}

/**
 * Levelling up mid-test is the app working, not the app breaking — but a modal
 * or a toast will happily swallow the next click. Wait for any celebration to
 * actually start, then clear it.
 */
const settle = async (p = page) => {
  await p.waitForTimeout(700)
  for (let i = 0; i < 8; i++) {
    if ((await p.locator('.overlay').count()) === 0) break
    const keep = p.getByRole('button', { name: 'Keep going' })
    if (await keep.count()) await keep.click({ timeout: 2500 }).catch(() => {})
    else await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
  }
  await p.locator('.toast').last().waitFor({ state: 'detached', timeout: 4000 }).catch(() => {})
}

const moneyOn = async (p) =>
  Number((await p.locator('.hoard__total').first().innerText()).replace(/[^\d.]/g, ''))
const money = async () => moneyOn(page)

const saveOn = async (p, amount, button = /Log (something|your first deposit)/, confirm = 'Save it') => {
  await settle(p)
  await p.getByRole('button', { name: button }).click()
  await p.getByLabel('Amount', { exact: true }).fill(amount)
  await p.getByRole('button', { name: confirm }).click()
  // The headline figure eases to its new value; let the roll-up land.
  await p.waitForTimeout(1300)
}
const save = async (amount, button, confirm) => saveOn(page, amount, button, confirm)

const go = async (hash) => {
  await settle()
  await page.goto(`${BASE}#/${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(250)
}

console.log('\nhoard e2e\n')

/* ------------------------------------------------------------- onboarding */
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE, { waitUntil: 'networkidle' })

await check('first run opens onboarding', async () => {
  await page.waitForSelector('.onboard')
  assert.ok(await page.getByText('Welcome to Hoard').isVisible())
})

await check('onboarding creates a named profile and a Christmas vault', async () => {
  await page.getByPlaceholder('Optional').fill('Jordan')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Christmas', exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: '$400' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: '$150' }).click()
  await page.getByRole('button', { name: 'Start my hoard' }).click()
  // Creating that first vault is itself worth a level, so a level-up window
  // opens straight away — clear it before reading the screen behind it.
  await settle()
  await page.waitForSelector('.companion')
  assert.match(await page.locator('.companion').textContent(), /Jordan/i)
  assert.match(await page.locator('.app__scroll').innerText(), /Christmas/)
})

/* ----------------------------------------------------------------- saving */
await check('saving money updates the headline total', async () => {
  const before = await money()
  await save('42.50')
  assert.equal(await money(), before + 42.5)
})

await check('a deposit awards XP and says so', async () => {
  assert.match(await page.locator('.toasts').innerText(), /XP/)
})

await check('the ladder is climbed by saving', async () => {
  await settle()
  const level = Number((await page.locator('.companion').textContent()).match(/Lv\s*(\d+)/)?.[1] ?? 0)
  assert.ok(level >= 2, `expected past level 1, was ${level}`)
})

await check('the amount parser handles a comma-grouped figure', async () => {
  const before = await money()
  await save('1,250.25')
  assert.equal(await money(), before + 1250.25)
})

await check('money lands in the vault it was aimed at', async () => {
  await go('vaults')
  await page.locator('.vaultcard').first().click()
  await page.waitForSelector('.vaulthero__name')
  await save('100', 'Add to Christmas')
  assert.match(await page.locator('.hoard__total').first().innerText(), /\$100/)
})

await check('the pace engine reports a required weekly rate', async () => {
  await page.waitForSelector('.grid')
  const text = (await page.locator('.grid').first().textContent()) ?? ''
  assert.match(text, /Needed per week/i)
  assert.match(text, /\$\d/)
})

await check('the what-if slider moves the projected date', async () => {
  const slider = page.getByLabel('Weekly contribution to simulate', { exact: true })
  await slider.fill('0.05')
  await page.waitForTimeout(300)
  const slow = await page.locator('.whatif').innerText()
  await slider.fill('0.95')
  await page.waitForTimeout(300)
  assert.notEqual(slow, await page.locator('.whatif').innerText())
})

/* ------------------------------------------------------------ persistence */
await check('everything survives a reload', async () => {
  await settle()
  const raw = await page.evaluate(() => localStorage.getItem('hoard.state'))
  assert.ok(raw && raw.length > 100, 'nothing was written to storage')
  await go('home')
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('.companion')
  await settle()
  assert.equal(await money(), 1392.75)
  assert.match(await page.locator('.companion').textContent(), /Jordan/)
})

/* ----------------------------------------------------------------- quests */
await check('claiming a quest removes it from the claimable pile', async () => {
  await go('quests')
  const claims = page.getByRole('button', { name: 'Claim' })
  const before = await claims.count()
  if (before > 0) {
    await claims.first().click()
    await page.waitForTimeout(700)
    await settle()
    assert.ok((await page.getByRole('button', { name: 'Claim' }).count()) < before)
  }
})

/* ----------------------------------------------------------------- themes */
await check('an unlocked theme applies and survives a reload', async () => {
  await go('profile')
  const before = await page.evaluate(() => document.documentElement.dataset.hoardAccent)
  const option = page.locator('.themeopt:not(.is-locked)').nth(1)
  if (await option.count()) {
    await option.click()
    await page.waitForTimeout(400)
    const after = await page.evaluate(() => document.documentElement.dataset.hoardAccent)
    assert.notEqual(after, before)
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.evaluate(() => document.documentElement.dataset.hoardAccent), after)
  }
})

await check('locked themes cannot be selected', async () => {
  const locked = page.locator('.themeopt.is-locked').first()
  if (await locked.count()) assert.ok(await locked.isDisabled())
})

/* ------------------------------------------------------------ destructive */
await check('deleting a vault keeps its money in the Bank', async () => {
  await go('vaults')
  await page.locator('.vaultcard').first().click()
  await page.waitForSelector('.vaulthero__name')
  await page.getByLabel('Delete vault').click()
  await page.locator('.sheet').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(700)
  await go('home')
  assert.equal(await money(), 1392.75)
})

/* --------------------------------------------------------- accessibility */
await check('Escape closes a sheet', async () => {
  await settle()
  await page.getByRole('button', { name: /Log (something|your first deposit)/ }).click()
  await page.waitForSelector('.sheet')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.sheet').count(), 0)
})

await check('a sheet moves focus to its first control', async () => {
  await page.getByRole('button', { name: /Log (something|your first deposit)/ }).click()
  await page.waitForTimeout(500)
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Amount')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

await check('the n shortcut opens the save sheet', async () => {
  await page.keyboard.press('n')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.sheet').count(), 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

await check('the tab bar exposes its current page to assistive tech', async () => {
  await go('progress')
  assert.equal(await page.locator('.tabbar__btn[aria-current="page"]').count(), 1)
})

/* -------------------------------------------------------------- rendering */
await check('every tab renders real content with no broken values', async () => {
  for (const tab of ['home', 'vaults', 'quests', 'progress', 'profile']) {
    await go(tab)
    const text = await page.locator('.app__scroll').innerText()
    assert.ok(text.length > 40, `${tab} rendered almost nothing`)
    assert.ok(!/NaN|undefined|Infinity/.test(text), `${tab} shows a broken value`)
  }
})

await check('an unknown route falls back to home rather than a blank screen', async () => {
  await page.goto(`${BASE}#/not-a-real-route`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  assert.ok((await page.locator('.hoard__total').count()) >= 1)
})

/* -------------------------------------------------------------- demo data */
await check('demo data loads a full, coherent account', async () => {
  await go('profile')
  await page.getByRole('button', { name: 'Load demo data' }).click()
  await page.getByRole('button', { name: 'Load it' }).click()
  await settle()
  await go('home')
  assert.ok((await money()) > 500, 'demo account looks empty')
  assert.ok(/Lv\s*(1[0-9]|[6-9])/.test(await page.locator('.companion').textContent()), 'demo level too low')
})

await check('the progress screen draws its charts on real data', async () => {
  await go('progress')
  assert.ok((await page.locator('.chart__svg').count()) >= 2, 'charts missing')
  assert.ok((await page.locator('.heat__cell').count()) > 100, 'heatmap missing')
  assert.ok((await page.locator('.ach').count()) > 20, 'achievements missing')
})

/* --------------------------------------------------------------- spending */
await check('a spend never touches the hoard, and lands on the spending screen', async () => {
  await settle()
  await go('home')
  const hoardBefore = await money()
  await page.getByRole('button', { name: /Log (something|your first deposit)/ }).click()
  await page.getByRole('button', { name: 'Spent', exact: true }).click()
  await page.getByLabel('Amount', { exact: true }).fill('12.25')
  await page.getByRole('button', { name: 'Log it' }).click()
  await page.waitForTimeout(1400)
  await settle()
  assert.equal(await money(), hoardBefore, 'spending moved the savings total')

  // The week panel used to sit on home as well. Spending belongs with the
  // limit it is measured against, so it is on Goals and only there.
  await go('quests')
  await page.waitForTimeout(400)
  const limit = await page.locator('.panel', { hasText: 'Weekly spending limit' }).first().innerText()
  assert.match(limit, /spent/i, 'the spend did not reach the screen that tracks it')
})

await check('the weekly limit can be set and drives safe-to-spend', async () => {
  await go('quests')
  const panel = page.locator('.panel').filter({ hasText: 'Weekly spending limit' }).first()
  await panel.getByRole('button', { name: /Change|Set one/ }).click()
  await page.getByLabel('Amount', { exact: true }).fill('140')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForTimeout(700)
  assert.match(await panel.innerText(), /\$140/)
})

/* --------------------------------------------------------------- activity */
await check('the activity ledger lists and filters the full history', async () => {
  await go('activity')
  const rows = await page.locator('.activity').count()
  assert.ok(rows > 10, `expected a full ledger, saw ${rows} rows`)
  await page.getByRole('button', { name: 'Withdrawn' }).click()
  await page.waitForTimeout(400)
  const outRows = await page.locator('.activity').count()
  assert.ok(outRows > 0 && outRows < rows, 'the money-out filter did nothing')
  assert.ok(!/\+\$/.test(await page.locator('.activity__amount').first().innerText()))
})

await check('the ledger can isolate the Bank', async () => {
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: /Bank/ }).click()
  await page.waitForTimeout(400)
  const names = await page.locator('.activity__title').allInnerTexts()
  assert.ok(names.length > 0, 'no Bank entries found')
})

await check('an entry can be deleted from the ledger', async () => {
  await page.getByRole('button', { name: 'Everything' }).click()
  await page.waitForTimeout(300)
  const before = await page.locator('.activity').count()
  await page.locator('.activity__del').first().click()
  await page.waitForTimeout(600)
  assert.equal(await page.locator('.activity').count(), before - 1)
})

/**
 * The delete control sits on every row of a list hundreds long, and a ledger
 * row is a financial record. The undo it offers has to actually be reachable:
 * the toast layer is pointer-events:none so a passing message never eats a tap,
 * which had left this button visible, styled and completely inert.
 */
await check('a deleted entry can be put back, and the total comes back with it', async () => {
  // The previous test's own undo offer lives for seven seconds. Start from a
  // clear toast layer so "is there an Undo on screen" means this delete's.
  await page.waitForFunction(() => document.querySelectorAll('.toast').length === 0,
    undefined, { timeout: 12000 })
  const before = await page.locator('.activity').count()
  const totalOf = () => page.locator('.activity-total, .panel .num').first().innerText()
  const totalBefore = await totalOf()

  await page.locator('.activity__del').first().click()
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.activity').count(), before - 1, 'the row did not go')

  const undo = page.getByRole('button', { name: 'Undo' })
  assert.equal(await undo.count(), 1, 'no undo was offered')
  await undo.click({ timeout: 4000 })
  await page.waitForTimeout(500)

  assert.equal(await page.locator('.activity').count(), before, 'the row did not come back')
  assert.equal(await totalOf(), totalBefore, 'the money did not come back with the row')
})

/* --------------------------------------------------- sandboxed embedding */
await check('a sandboxed embed offers a copyable backup instead of a dead download', async () => {
  const frame = await browser.newPage({ viewport: { width: 420, height: 900 } })
  await frame.setContent(
    `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>` +
    `<iframe src="${BASE}#/profile"></iframe>`,
    { waitUntil: 'networkidle' },
  )
  const inner = frame.frameLocator('iframe')
  // Get past onboarding inside the frame.
  const demo = inner.getByRole('button', { name: 'See a demo instead' })
  if (await demo.count()) {
    await demo.click()
    await frame.waitForTimeout(2600)
  }
  const keep = inner.getByRole('button', { name: 'Keep going' })
  if (await keep.count()) await keep.click().catch(() => {})
  await frame.waitForTimeout(600)

  // Navigate the framed app to Profile without reloading the outer page.
  await inner.locator('.tabbar__btn').last().click()
  await frame.waitForTimeout(600)

  await inner.getByRole('button', { name: 'Copy backup' }).click()
  await frame.waitForTimeout(600)
  const text = await inner.getByLabel('Backup data').inputValue()
  assert.match(text, /"version"/)
  assert.ok(text.length > 200, 'backup looks empty')
  await frame.close()
})

/* ------------------------------------------------------ install on mobile */
await check('an iPhone in Safari is told how to install before setting up', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const ip = await ctx.newPage()
  await ip.goto(BASE, { waitUntil: 'networkidle' })
  await ip.evaluate(() => localStorage.clear())
  await ip.reload({ waitUntil: 'networkidle' })
  await ip.waitForSelector('.onboard__title')

  assert.match(await ip.locator('.onboard__title').innerText(), /Home Screen/i)
  assert.equal(await ip.locator('.installstep').count(), 4, 'expected four install steps')
  // The storage warning is the whole reason this comes first.
  assert.match(await ip.locator('.installnote').innerText(), /separate storage/i)
  assert.equal(await ip.locator('.notch__cell').count(), 6, 'install step should add a step')

  // It must never be a dead end.
  await ip.getByRole('button', { name: 'Continue anyway' }).click()
  await ip.waitForTimeout(400)
  assert.match(await ip.locator('.onboard__title').innerText(), /Welcome to Hoard/i)
  await ctx.close()
})

await check('the installed app skips straight to setup', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const ip = await ctx.newPage()
  // navigator.standalone is what iOS sets inside a Home Screen app.
  await ip.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }))
  await ip.goto(BASE, { waitUntil: 'networkidle' })
  await ip.evaluate(() => localStorage.clear())
  await ip.reload({ waitUntil: 'networkidle' })
  await ip.waitForSelector('.onboard__title')

  assert.match(await ip.locator('.onboard__title').innerText(), /Welcome to Hoard/i)
  assert.equal(await ip.locator('.installstep').count(), 0)
  assert.equal(await ip.locator('.notch__cell').count(), 5)
  await ctx.close()
})

await check('a desktop browser is not nagged about installing', async () => {
  const ctx = await browser.newContext()
  const dp = await ctx.newPage()
  await dp.goto(BASE, { waitUntil: 'networkidle' })
  await dp.evaluate(() => localStorage.clear())
  await dp.reload({ waitUntil: 'networkidle' })
  await dp.waitForSelector('.onboard__title')
  assert.match(await dp.locator('.onboard__title').innerText(), /Welcome to Hoard/i)
  assert.equal(await dp.locator('.installstep').count(), 0)
  await ctx.close()
})

await check('an iPhone inside a frame is not told to tap Share in Safari', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const fp = await ctx.newPage()
  await fp.setContent(
    `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>` +
    `<iframe src="${BASE}"></iframe>`,
    { waitUntil: 'networkidle' },
  )
  const inner = fp.frameLocator('iframe')
  await inner.locator('.onboard__title').waitFor({ timeout: 6000 })
  assert.match(await inner.locator('.onboard__title').innerText(), /Welcome to Hoard/i)
  assert.equal(await inner.locator('.installstep').count(), 0)
  await ctx.close()
})

await check('nothing is hidden under the status bar on a notched iPhone', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const ip = await ctx.newPage()
  await ip.goto(BASE, { waitUntil: 'networkidle' })
  await ip.evaluate(() => localStorage.clear())
  // env(safe-area-inset-*) always reports 0 in a desktop-class browser, which
  // is precisely why this shipped broken. Simulate a real notch.
  await ip.addStyleTag({ content: ':root{--safe-top:47px;--safe-bottom:34px}' })
  await ip.reload({ waitUntil: 'networkidle' })
  await ip.addStyleTag({ content: ':root{--safe-top:47px;--safe-bottom:34px}' })
  // The demo link lives on step 0, which on iPhone is the install step.
  await ip.getByRole('button', { name: 'See a demo instead' }).click()
  await ip.waitForTimeout(3200)
  const keep = ip.getByRole('button', { name: 'Keep going' })
  if (await keep.count()) await keep.click().catch(() => {})
  await ip.waitForTimeout(2500)
  await ip.addStyleTag({ content: ':root{--safe-top:47px;--safe-bottom:34px}' })

  const clearsNotch = async (locator, label) => {
    const box = await locator.boundingBox()
    assert.ok(box, `${label} not found`)
    assert.ok(box.y >= 47, `${label} starts at y=${box.y}, under the 47px status bar`)
  }

  // A screen that renders a topbar.
  await clearsNotch(ip.locator('.topbar__title').first(), 'home topbar')

  // And one that does not — this is the screen that was reported broken.
  await ip.goto(`${BASE}#/vaults`, { waitUntil: 'networkidle' })
  await ip.addStyleTag({ content: ':root{--safe-top:47px;--safe-bottom:34px}' })
  await ip.locator('.vaultcard').first().click()
  await ip.waitForSelector('.vaulthero__name')
  await ip.addStyleTag({ content: ':root{--safe-top:47px;--safe-bottom:34px}' })
  await clearsNotch(ip.getByRole('button', { name: 'Vaults' }).first(), 'vault detail back button')
  await ctx.close()
})

await check('the status bar style does not force white text over a light page', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const ip = await ctx.newPage()
  await ip.goto(BASE, { waitUntil: 'networkidle' })
  const style = await ip.locator('meta[name="apple-mobile-web-app-status-bar-style"]')
    .getAttribute('content')
  // black-translucent means white status text and content running underneath.
  assert.notEqual(style, 'black-translucent')
  await ctx.close()
})

await check('the page carries an apple-touch-icon, so iOS does not use a screenshot', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] })
  const ip = await ctx.newPage()
  await ip.goto(BASE, { waitUntil: 'networkidle' })
  const icon = await ip.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  assert.ok(icon && icon.startsWith('data:image/png;base64,'), 'apple-touch-icon must be an inlined PNG')
  assert.ok(icon.length > 1000, 'apple-touch-icon looks empty')
  assert.equal(
    await ip.locator('meta[name="apple-mobile-web-app-title"]').getAttribute('content'), 'Hoard')
  await ctx.close()
})

/**
 * Icon paths in a manifest resolve against the manifest's own URL. When the
 * manifest was itself a data: URI they could not resolve at all, and an
 * Android install fell back to a screenshot with nothing reporting an error.
 */
await check('the manifest offers icons that actually resolve', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  assert.ok(href, 'no manifest')
  const url = new URL(href, page.url()).href
  const manifest = await (await page.request.get(url)).json()
  const icons = manifest.icons ?? []
  assert.ok(icons.length > 0, 'the manifest declares no icons')
  assert.ok(
    icons.some((i) => i.purpose === 'maskable'),
    'no maskable icon, so Android crops the mark to fit its own shape',
  )
  for (const icon of icons) {
    const at = new URL(icon.src, url).href
    const res = await page.request.get(at)
    assert.equal(res.status(), 200, `${icon.src} is declared but not served`)
  }
})

/* --------------------------------------------------------------- the bank */
await check('the Bank offers a weekly split into vaults, and taking it moves the money', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const bp = await ctx.newPage()
  await bp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await bp.evaluate(() => localStorage.clear())
  await bp.goto(BASE, { waitUntil: 'networkidle' })

  // A fresh account with one dated, targeted vault — same path onboarding
  // already takes in the main flow above.
  await bp.waitForSelector('.onboard')
  await bp.getByPlaceholder('Optional').fill('Riley')
  await bp.getByRole('button', { name: 'Next' }).click()
  await bp.getByRole('button', { name: 'Next' }).click()
  await bp.getByRole('button', { name: 'Christmas', exact: true }).click()
  await bp.getByRole('button', { name: 'Next' }).click()
  await bp.getByRole('button', { name: '$400' }).click()
  await bp.getByRole('button', { name: 'Next' }).click()
  await bp.getByRole('button', { name: '$150' }).click()
  await bp.getByRole('button', { name: 'Start my hoard' }).click()
  await settle(bp)
  await bp.waitForSelector('.companion')

  // The exact complaint the Bank exists to fix: a single lump deposit should
  // not leave every vault sitting at zero.
  await saveOn(bp, '600')
  await settle(bp)
  const totalAfterDeposit = await moneyOn(bp)

  const sendButton = bp.getByRole('button', { name: 'Send to vaults' })
  await sendButton.waitFor({ timeout: 4000 })
  assert.match(await bp.getByText('unsplit').innerText(), /\$/)

  await sendButton.click()
  await bp.waitForTimeout(900)

  // It's a move, not new saving — the headline total does not change.
  assert.equal(await moneyOn(bp), totalAfterDeposit)
  // Offered once — taking it clears the prompt until the next ISO week.
  assert.equal(await bp.getByRole('button', { name: 'Send to vaults' }).count(), 0)

  await bp.goto(`${BASE}#/vaults`, { waitUntil: 'networkidle' })
  const vaultText = await bp.locator('.vaultcard').first().innerText()
  assert.match(vaultText, /\$[1-9]/, 'the vault is still at zero after a distribution')

  await ctx.close()
})

/* --------------------------------------------------------------- backups */
await check('an account with real history is told to back it up, and the nudge clears', async () => {
  // clipboard-write is load-bearing, not a convenience. Without the grant
  // navigator.clipboard.writeText rejects, the app takes its honest fallback
  // ("select the text and copy it") and records no backup — so the nudge
  // stays, exactly as it should, and the assertion below fails for a reason
  // that has nothing to do with what this test is checking.
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['clipboard-write'],
  })
  const bp = await ctx.newPage()
  await bp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await bp.evaluate(() => localStorage.clear())
  await bp.goto(BASE, { waitUntil: 'networkidle' })

  // The demo account carries months of history and has never been exported.
  await bp.waitForSelector('.onboard')
  await bp.getByRole('button', { name: 'See a demo instead' }).click()
  await settle(bp)
  await bp.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await bp.waitForTimeout(400)

  const nudge = bp.getByText('Keep it safe')
  await nudge.waitFor({ timeout: 4000 })
  assert.match(await bp.locator('.panel', { hasText: 'Keep it safe' }).innerText(),
    /lives on this phone/i)

  // Taking a backup should retire it. Downloads are unavailable here, so use
  // the copy path, which is the one that works on a phone anyway.
  await bp.goto(`${BASE}#/profile`, { waitUntil: 'networkidle' })
  await bp.getByRole('button', { name: 'Copy backup' }).click()
  await bp.getByRole('button', { name: 'Copy to clipboard' }).click()
  // Wait for the outcome rather than a guessed delay: the success toast is
  // the only signal that the copy landed and the backup was recorded.
  await bp.getByText('Backup copied to the clipboard').waitFor({ timeout: 4000 })
  await bp.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await bp.waitForTimeout(400)
  assert.equal(await bp.getByText('Keep it safe').count(), 0, 'the nudge outlived the backup')

  await ctx.close()
})

/* --------------------------------------------------------------- offline */
/**
 * Hoard is installed to a home screen and holds every entry in localStorage on
 * that same phone, so needing a connection to *boot* meant a blank screen in
 * front of data already on the device. Nothing caught that for weeks, because
 * every other assertion here runs against a live server.
 */
await check('the installed app opens with no connection', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const op = await ctx.newPage()
  await op.goto(BASE, { waitUntil: 'networkidle' })

  // The worker has to be installed and in control before it can serve anything.
  const controlled = await op.evaluate(() => {
    // Raced against a deadline in the page: if no worker ever takes control
    // this has to fail the assertion below, not block the run forever.
    const ready = (async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((r) =>
          navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }))
      }
      return true
    })()
    return Promise.race([ready, new Promise((r) => setTimeout(() => r(false), 15000))])
  })
  assert.ok(controlled, 'no service worker took control, so the app cannot open offline')

  await op.evaluate(() => localStorage.setItem('hoard-offline-probe', 'survived'))
  await ctx.setOffline(true)

  // A cold launch from the home screen, with the network gone.
  const cold = await ctx.newPage()
  await cold.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await cold.waitForTimeout(1200)
  const text = await cold.locator('body').innerText()
  assert.ok(text.trim().length > 0, 'the app was a blank screen offline')
  assert.match(text, /Hoard/, 'the app rendered offline but not recognisably')
  assert.equal(
    await cold.evaluate(() => localStorage.getItem('hoard-offline-probe')),
    'survived',
    'saved data did not survive an offline launch')

  await ctx.close()
})

await check('offline caching keeps exactly one version', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const cp = await ctx.newPage()
  await cp.goto(BASE, { waitUntil: 'networkidle' })
  const ready = await cp.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 15000)),
    ]))
  assert.ok(ready, 'no service worker registered')
  await cp.waitForTimeout(2500)
  // Stale caches accumulating on every deploy would eat the storage budget the
  // app's own savings history lives in.
  const keys = await cp.evaluate(() => caches.keys())
  assert.equal(keys.length, 1, `expected one cache, found ${keys.length}: ${keys.join(', ')}`)
  await ctx.close()
})

/* -------------------------------------------------------------- reminders */
/**
 * Hoard cannot send a notification — no server, and the web cannot schedule
 * one for while the app is closed. It writes a calendar event instead, so the
 * thing that has to work is the file: a real download, parseable, repeating,
 * and carrying the figures the vaults need *today*.
 */
await check('the weekly reminder downloads a real calendar event', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const rp = await ctx.newPage()
  await rp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await rp.evaluate(() => localStorage.clear())
  await rp.goto(BASE, { waitUntil: 'networkidle' })
  await rp.waitForSelector('.onboard')
  await rp.getByRole('button', { name: 'See a demo instead' }).click()
  await settle(rp)
  await rp.goto(`${BASE}#/quests`, { waitUntil: 'networkidle' })
  await rp.waitForTimeout(500)

  const add = rp.getByRole('button', { name: 'Add to my calendar' })
  assert.equal(await add.count(), 1, 'no reminder was offered')

  const [download] = await Promise.all([
    rp.waitForEvent('download', { timeout: 8000 }),
    add.click(),
  ])
  const stream = await download.createReadStream()
  const ics = await new Promise((resolve, reject) => {
    let out = ''
    stream.on('data', (c) => { out += c })
    stream.on('end', () => resolve(out))
    stream.on('error', reject)
  })

  assert.match(ics, /^BEGIN:VCALENDAR/, 'not a calendar file')
  assert.match(ics, /BEGIN:VEVENT/, 'no event in it')
  assert.match(ics, /RRULE:FREQ=WEEKLY/, 'the reminder does not repeat')
  assert.match(ics, /^UID:.+@hoard\.local/m, 'no stable uid, so re-adding would duplicate')
  assert.match(ics, /^SEQUENCE:1/m, 'first export should be sequence 1')
  // The event must quote a real figure, not a placeholder.
  assert.match(ics, /SUMMARY:Hoard .*\$[0-9]/, 'the event does not name an amount')

  // Having been added, the panel should say so rather than offering again.
  await rp.waitForTimeout(400)
  assert.equal(await rp.getByRole('button', { name: 'Add to my calendar' }).count(), 0,
    'still offering to add a reminder that exists')
  assert.match(await rp.locator('.panel', { hasText: 'Weekly reminder' }).innerText(),
    /up to date/i)

  await ctx.close()
})

/**
 * The whole point of a stored signature: money moves, the figure in the
 * calendar goes out of date, and a reminder that is confidently wrong is
 * worse than no reminder. Re-exporting must replace the event, not add a
 * second one — same UID, higher SEQUENCE.
 */
await check('the reminder notices when it has gone out of date, and replaces itself', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
  const rp = await ctx.newPage()
  await rp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await rp.evaluate(() => localStorage.clear())
  await rp.goto(BASE, { waitUntil: 'networkidle' })
  await rp.waitForSelector('.onboard')
  await rp.getByRole('button', { name: 'See a demo instead' }).click()
  await settle(rp)

  await rp.goto(`${BASE}#/quests`, { waitUntil: 'networkidle' })
  await rp.waitForTimeout(400)
  const [first] = await Promise.all([
    rp.waitForEvent('download', { timeout: 8000 }),
    rp.getByRole('button', { name: 'Add to my calendar' }).click(),
  ])
  const uidOf = async (dl) => {
    const stream = await dl.createReadStream()
    const text = await new Promise((res, rej) => {
      let o = ''
      stream.on('data', (c) => { o += c })
      stream.on('end', () => res(o)); stream.on('error', rej)
    })
    return { uid: /^UID:(.+)$/m.exec(text)?.[1], seq: /^SEQUENCE:(\d+)$/m.exec(text)?.[1], text }
  }
  const one = await uidOf(first)
  assert.equal(one.seq, '1')

  // Money moves, so the figure the reminder quotes is no longer right.
  await rp.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await settle(rp)
  await saveOn(rp, '250')
  await settle(rp)
  await rp.goto(`${BASE}#/quests`, { waitUntil: 'networkidle' })
  await rp.waitForTimeout(500)

  const update = rp.getByRole('button', { name: 'Update the reminder' })
  assert.equal(await update.count(), 1, 'the reminder did not notice it was out of date')

  const [second] = await Promise.all([
    rp.waitForEvent('download', { timeout: 8000 }),
    update.click(),
  ])
  const two = await uidOf(second)
  assert.equal(two.uid, one.uid, 'a new uid would leave two reminders in the calendar')
  assert.equal(two.seq, '2', 'the sequence must rise for a calendar to treat it as an update')

  await rp.waitForTimeout(400)
  assert.equal(await rp.getByRole('button', { name: 'Update the reminder' }).count(), 0,
    'still asking to update after updating')

  await ctx.close()
})

/**
 * The share sheet is the iOS route and cannot be driven headlessly, so what is
 * checked here is the thing that actually breaks: that a context which can do
 * neither share nor download still shows the reminder rather than a button
 * that silently does nothing.
 */
await check('a reminder that cannot be handed to the calendar is shown to set by hand', async () => {
  const frame = await browser.newPage({ viewport: { width: 420, height: 900 } })
  await frame.setContent(
    `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>` +
    `<iframe src="${BASE}#/quests" sandbox="allow-scripts allow-same-origin"></iframe>`,
    { waitUntil: 'networkidle' },
  )
  const inner = frame.frameLocator('iframe')
  const demo = inner.getByRole('button', { name: 'See a demo instead' })
  if (await demo.count()) {
    await demo.click()
    await frame.waitForTimeout(2600)
    for (let i = 0; i < 6; i++) {
      const keep = inner.getByRole('button', { name: 'Keep going' })
      if (await keep.count()) { await keep.click().catch(() => {}) } else break
      await frame.waitForTimeout(300)
    }
  }
  // Loading the demo navigates home, so the hash in the iframe src is gone by
  // now — reach Goals the way a person would.
  await inner.locator('.tabbar__btn', { hasText: 'GOALS' }).click()
  await frame.waitForTimeout(800)

  const add = inner.getByRole('button', { name: 'Add to my calendar' })
  await add.waitFor({ timeout: 6000 })
  await add.click()
  await frame.waitForTimeout(500)

  const panel = inner.locator('.panel', { hasText: 'Weekly reminder' })
  const text = await panel.innerText()
  assert.match(text, /set it yourself|Set it yourself/i, 'no manual fallback was offered')
  assert.match(text, /^Every \w+day/m, 'the fallback does not say when to repeat it')
  assert.match(text, /\$/, 'the fallback does not name an amount')

  await frame.close()
})

/* ------------------------------------------------------------ correcting */
/**
 * The app could delete a financial record but never fix one: a mistyped
 * amount meant removing the row and logging it again. The reducer could
 * already do it — nothing called it.
 */
await check('a mistyped entry can be corrected, and the total follows', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const ep = await ctx.newPage()
  await ep.goto(BASE, { waitUntil: 'domcontentloaded' })
  await ep.evaluate(() => localStorage.clear())
  await ep.goto(BASE, { waitUntil: 'networkidle' })
  await ep.waitForSelector('.onboard')
  await ep.getByRole('button', { name: 'See a demo instead' }).click()
  await settle(ep)

  await ep.goto(`${BASE}#/activity`, { waitUntil: 'networkidle' })
  await ep.waitForTimeout(600)
  const totalOf = async () =>
    Number((await ep.locator('.num--hero').first().innerText()).replace(/[^0-9.]/g, ''))
  const before = await totalOf()

  // Deposits are the ones that move the hoard total — a spend never touches
  // it, by design. Only editable rows render as a button, so this also skips
  // the halves of a Bank split.
  await ep.getByRole('button', { name: 'Saved', exact: true }).click()
  await ep.waitForTimeout(400)
  const row = ep.locator('button.activity__open').first()
  const was = Number((await row.locator('.activity__amount').innerText()).replace(/[^0-9.]/g, ''))

  await row.click()
  await ep.waitForSelector('.sheet')
  assert.match(await ep.locator('.sheet').innerText(), /Correct this entry/i)

  const field = ep.locator('.amount__input')
  await field.fill('')
  await field.type('12.34')
  await ep.getByRole('button', { name: 'Save the correction' }).click()
  await settle(ep)

  const after = await totalOf()
  const delta = Math.round((after - before) * 100) / 100
  const expected = Math.round((12.34 - was) * 100) / 100
  assert.equal(delta, expected,
    `correcting ${was} to 12.34 moved the total by ${delta}, expected ${expected}`)

  // It corrected the row rather than adding another one.
  assert.match(await ep.locator('.activity__amount').first().innerText(), /12\.34/)

  // Both halves of a Bank split have to agree, so neither may be edited by
  // hand. The demo has no splits until one is taken, so make one first —
  // asserting this against data that contains no transfers proves nothing.
  await ep.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await settle(ep)
  const send = ep.getByRole('button', { name: 'Send to vaults' })
  assert.equal(await send.count(), 1, 'no split was on offer to make a transfer with')
  await send.click()
  await settle(ep)

  await ep.goto(`${BASE}#/activity`, { waitUntil: 'networkidle' })
  await ep.waitForTimeout(600)
  const rows = await ep.locator('.activity__open').count()
  const editable = await ep.locator('button.activity__open').count()
  assert.ok(rows > editable,
    'a Bank split was editable by hand, so its two halves can be pulled apart')

  await ctx.close()
})

/* ------------------------------------------------------ first-run clarity */
/**
 * A stranger opening this app met about fifteen ideas at once. The ones that
 * have no job yet stay out of the way: the Bank has nothing to split when
 * there is one vault, and rewards for activity are noise before any activity.
 */
await check('a brand-new account is not shown machinery it has no use for yet', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const fp = await ctx.newPage()
  await fp.goto(BASE, { waitUntil: 'domcontentloaded' })
  await fp.evaluate(() => localStorage.clear())
  await fp.goto(BASE, { waitUntil: 'networkidle' })
  await fp.waitForSelector('.onboard')
  await fp.getByPlaceholder('Optional').fill('Jordan')
  await fp.getByRole('button', { name: 'Next' }).click()
  await fp.getByRole('button', { name: 'Next' }).click()
  await fp.getByRole('button', { name: 'Christmas', exact: true }).click()
  await fp.getByRole('button', { name: 'Next' }).click()
  await fp.getByRole('button', { name: '$400' }).click()
  await fp.getByRole('button', { name: 'Next' }).click()
  await fp.getByRole('button', { name: '$150' }).click()
  await fp.getByRole('button', { name: 'Start my hoard' }).click()
  await settle(fp)
  await fp.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await fp.waitForTimeout(500)

  const home = () => fp.locator('.app__scroll').innerText()
  const before = await home()
  assert.doesNotMatch(before, /\bBANK\b/,
    'the Bank introduced itself before it had anything to do')
  assert.doesNotMatch(before, /\bQUESTS\b/,
    'rewards were offered before there was any activity to reward')
  // What it *should* lead with.
  assert.match(before, /Log your first deposit/)

  // The rank has to fit its panel. It is one long uppercase word on a wide
  // axis in a column shared with the drawing and the streak, and at a fixed
  // size it ran straight through the panel's right edge.
  const rank = fp.locator('.companion__rank').first()
  const rb = await rank.boundingBox()
  const pb = await fp.locator('.companion').first().boundingBox()
  assert.ok(rb.x + rb.width <= pb.x + pb.width,
    'the rank name overflows its panel')
  assert.ok(rb.height < 40, 'the rank name wrapped or broke mid-word')

  // The first deposit brings the rewards out.
  await saveOn(fp, '25')
  await settle(fp)
  await fp.goto(`${BASE}#/home`, { waitUntil: 'networkidle' })
  await fp.waitForTimeout(500)
  assert.match(await home(), /\bQUESTS\b/, 'quests never appeared after a deposit')

  await ctx.close()
})

await browser.close()

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error('\n' + failures.join('\n'))
  process.exit(1)
}
