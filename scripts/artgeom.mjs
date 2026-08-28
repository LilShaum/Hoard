/**
 * Geometry audit for the companion art. Run it after editing any path in
 * src/ui/Creature.tsx:
 *
 *     npx vite --port 5199 &   # not needed; this reads the file directly
 *     node scripts/artgeom.mjs
 *
 * It checks the two things that make line art look rough, and that the eye
 * misses at small sizes but sees instantly at large ones:
 *
 *  - **Attachment gaps.** Every appendage is an open path whose ends are meant
 *    to land on the body contour. A gap of even 2 units at a 2.6 stroke reads
 *    as a limb floating off the animal. This was the single biggest defect in
 *    the first line-art pass — the foot was 4 units clear of the body, the
 *    tail 3.7, the lowest crest spine 5.
 *  - **Kinks.** A sudden tangent turn inside a curve that is supposed to flow.
 *    Corners that are meant to be there — wing wrists, scallop tips, spine
 *    points, the shell rim — show up too, so read the list rather than
 *    treating any output as failure. BODY should carry none.
 */
import { launch } from './browser.mjs'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/ui/Creature.tsx', 'utf8')
const consts = {}
for (const m of src.matchAll(/^const ([A-Z_0-9]+) = '([^']+)'$/gm)) consts[m[1]] = m[2]

const browser = await launch()
const page = await browser.newPage()
await page.setContent('<svg id="s" viewBox="0 0 96 96"></svg>')

const out = await page.evaluate((consts) => {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.getElementById('s')
  const mk = (d) => {
    const el = document.createElementNS(NS, 'path')
    el.setAttribute('d', d)
    svg.appendChild(el)
    return el
  }
  const tangentAt = (el, L, t) => {
    const e = Math.min(0.35, L / 400)
    const a = el.getPointAtLength(Math.max(0, t - e))
    const c = el.getPointAtLength(Math.min(L, t + e))
    return Math.atan2(c.y - a.y, c.x - a.x)
  }
  const kinks = (name, d) => {
    const el = mk(d)
    const L = el.getTotalLength()
    const found = []
    const step = L / 600
    let prev = tangentAt(el, L, 0)
    for (let t = step; t <= L; t += step) {
      const cur = tangentAt(el, L, t)
      let da = Math.abs(cur - prev)
      if (da > Math.PI) da = 2 * Math.PI - da
      if (da > 0.3) {
        const pt = el.getPointAtLength(t)
        found.push(`(${pt.x.toFixed(0)},${pt.y.toFixed(0)}) ${(da * 180 / Math.PI).toFixed(0)}deg`)
      }
      prev = cur
    }
    return { name, kinks: found }
  }
  const nearest = (el, L, px, py) => {
    let best = 1e9
    for (let t = 0; t <= L; t += L / 2000) {
      const q = el.getPointAtLength(t)
      best = Math.min(best, Math.hypot(q.x - px, q.y - py))
    }
    return +best.toFixed(2)
  }

  const body = mk(consts.BODY)
  const bodyL = body.getTotalLength()

  const endsOf = (d) => d.split(/(?=M)/).filter(Boolean).flatMap((run) => {
    const sub = mk(run)
    return [sub.getPointAtLength(0), sub.getPointAtLength(sub.getTotalLength())]
  })

  const contours = ['BODY', 'WING', 'WING_WIDE', 'WING_SMALL', 'WING_BUD', 'WING_FAR',
                    'WING_FAR_WIDE', 'TAIL', 'FOOT', 'CREST', 'CREST_SMALL', 'CREST_TALL', 'SHELL']
  const attached = contours.filter((n) => n !== 'BODY' && n !== 'SHELL')

  return {
    kinks: contours.filter((n) => consts[n]).map((n) => kinks(n, consts[n])),
    gaps: attached.filter((n) => consts[n]).map((n) => ({
      name: n,
      worst: Math.max(...endsOf(consts[n]).map((pt) => nearest(body, bodyL, pt.x, pt.y))),
    })),
  }
}, consts)

const TOLERANCE = 0.6
console.log('=== attachment gaps (endpoint to BODY contour) ===')
let bad = 0
for (const g of out.gaps) {
  const ok = g.worst <= TOLERANCE
  if (!ok) bad++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${g.name.padEnd(15)} worst ${g.worst}`)
}
console.log('\n=== kinks (intentional corners appear here too — read, do not panic) ===')
for (const k of out.kinks) {
  if (k.kinks.length) console.log(`  ${k.name}: ${k.kinks.join('  ')}`)
  else console.log(`  ${k.name}: smooth`)
}
await browser.close()
if (bad) { console.error(`\n${bad} appendage(s) floating off the body`); process.exit(1) }
console.log('\nall appendages land on the contour')
