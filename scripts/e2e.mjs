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

const saveOn = async (p, amount, button = 'Log something', confirm = 'Save it') => {
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
  await page.getByRole('button', { name: 'Log something' }).click()
  await page.waitForSelector('.sheet')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.sheet').count(), 0)
})

await check('a sheet moves focus to its first control', async () => {
  await page.getByRole('button', { name: 'Log something' }).click()
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
await check('a spend never touches the hoard and shows in the week panel', async () => {
  await settle()
  await go('home')
  const hoardBefore = await money()
  await page.getByRole('button', { name: 'Log something' }).click()
  await page.getByRole('button', { name: 'Spent', exact: true }).click()
  await page.getByLabel('Amount', { exact: true }).fill('12.25')
  await page.getByRole('button', { name: 'Log it' }).click()
  await page.waitForTimeout(1400)
  await settle()
  assert.equal(await money(), hoardBefore, 'spending moved the savings total')
  const week = await page.locator('.panel', { hasText: 'Safe to spend today' }).first().innerText()
  assert.match(week, /spent/i)
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

await browser.close()

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error('\n' + failures.join('\n'))
  process.exit(1)
}
