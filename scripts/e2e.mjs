/**
 * End-to-end smoke test against the real built app in a real browser.
 * The unit suite proves the engine; this proves the thing people touch.
 */
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
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
const settle = async () => {
  await page.waitForTimeout(700)
  for (let i = 0; i < 8; i++) {
    if ((await page.locator('.overlay').count()) === 0) break
    const keep = page.getByRole('button', { name: 'Keep going' })
    if (await keep.count()) await keep.click({ timeout: 2500 }).catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  await page.locator('.toast').last().waitFor({ state: 'detached', timeout: 4000 }).catch(() => {})
}

const money = async () =>
  Number((await page.locator('.hero__total').first().innerText()).replace(/[^\d.]/g, ''))

const save = async (amount, button = 'Save something') => {
  await settle()
  await page.getByRole('button', { name: button }).click()
  await page.getByLabel('Amount').fill(amount)
  await page.getByRole('button', { name: 'Save it' }).click()
  // The headline figure eases to its new value; let the roll-up land.
  await page.waitForTimeout(1300)
}

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
  await page.getByRole('button', { name: '🎄 Christmas' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: '$400' }).click()
  await page.getByRole('button', { name: 'Start my hoard' }).click()
  await page.waitForSelector('.hero__total')
  assert.match(await page.locator('.hero').innerText(), /Jordan/)
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
  const level = Number(await page.locator('.crest__level').innerText())
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
  await page.waitForSelector('.vaulthero')
  await save('100', 'Add to Christmas')
  assert.match(await page.locator('.vaulthero__figure').innerText(), /\$100/)
})

await check('the pace engine reports a required weekly rate', async () => {
  const text = await page.locator('.pacegrid').innerText()
  assert.match(text, /Needed per week/)
  assert.match(text, /\$\d/)
})

await check('the what-if slider moves the projected date', async () => {
  const slider = page.getByLabel('Weekly contribution to simulate')
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
  await page.waitForSelector('.hero__total')
  assert.equal(await money(), 1392.75)
  assert.match(await page.locator('.hero').innerText(), /Jordan/)
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
  const before = await page.evaluate(() => document.documentElement.dataset.hoardTheme)
  const option = page.locator('.themeopt:not(.is-locked)').nth(1)
  if (await option.count()) {
    await option.click()
    await page.waitForTimeout(400)
    const after = await page.evaluate(() => document.documentElement.dataset.hoardTheme)
    assert.notEqual(after, before)
    await page.reload({ waitUntil: 'networkidle' })
    assert.equal(await page.evaluate(() => document.documentElement.dataset.hoardTheme), after)
  }
})

await check('locked themes cannot be selected', async () => {
  const locked = page.locator('.themeopt.is-locked').first()
  if (await locked.count()) assert.ok(await locked.isDisabled())
})

/* ------------------------------------------------------------ destructive */
await check('deleting a vault keeps its money in the general hoard', async () => {
  await go('vaults')
  await page.locator('.vaultcard').first().click()
  await page.waitForSelector('.vaulthero')
  await page.getByLabel('Delete vault').click()
  await page.locator('.sheet').getByRole('button', { name: 'Delete', exact: true }).click()
  await page.waitForTimeout(700)
  await go('home')
  assert.equal(await money(), 1392.75)
})

/* --------------------------------------------------------- accessibility */
await check('Escape closes a sheet', async () => {
  await settle()
  await page.getByRole('button', { name: 'Save something' }).click()
  await page.waitForSelector('.sheet')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.sheet').count(), 0)
})

await check('a sheet moves focus to its first control', async () => {
  await page.getByRole('button', { name: 'Save something' }).click()
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
  assert.equal(await page.locator('.hero__total').count(), 1)
})

/* -------------------------------------------------------------- demo data */
await check('demo data loads a full, coherent account', async () => {
  await go('profile')
  await page.getByRole('button', { name: 'Load demo data' }).click()
  await page.getByRole('button', { name: 'Load it' }).click()
  await settle()
  await go('home')
  assert.ok((await money()) > 500, 'demo account looks empty')
  assert.ok(Number(await page.locator('.crest__level').innerText()) > 5, 'demo level too low')
})

await check('the progress screen draws its charts on real data', async () => {
  await go('progress')
  assert.ok((await page.locator('.chart__svg').count()) >= 2, 'charts missing')
  assert.ok((await page.locator('.heat__cell').count()) > 100, 'heatmap missing')
  assert.ok((await page.locator('.ach').count()) > 20, 'achievements missing')
})

/* --------------------------------------------------------------- activity */
await check('the activity ledger lists and filters the full history', async () => {
  await go('activity')
  const rows = await page.locator('.activity').count()
  assert.ok(rows > 10, `expected a full ledger, saw ${rows} rows`)
  await page.getByRole('button', { name: 'Money out' }).click()
  await page.waitForTimeout(400)
  const outRows = await page.locator('.activity').count()
  assert.ok(outRows > 0 && outRows < rows, 'the money-out filter did nothing')
  assert.ok(!/\+\$/.test(await page.locator('.activity__amount').first().innerText()))
})

await check('the ledger can isolate the general hoard', async () => {
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await page.getByRole('button', { name: /General hoard/ }).click()
  await page.waitForTimeout(400)
  const names = await page.locator('.activity__title').allInnerTexts()
  assert.ok(names.length > 0, 'no general-hoard entries found')
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

await browser.close()

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  console.error('\n' + failures.join('\n'))
  process.exit(1)
}
