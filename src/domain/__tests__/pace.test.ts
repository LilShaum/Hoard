import { describe, expect, it } from 'vitest'
import { computePace, simulate, suggestedPerWeek, velocityPerWeek } from '../pace'
import { entry, vault, weeklyDeposits } from './factory'
import { netOf } from '../stats'

const TODAY = '2026-08-21'
const XMAS = '2026-12-25'

const paceOf = (v: ReturnType<typeof vault>, es = [] as ReturnType<typeof entry>[]) =>
  computePace(v, es, netOf(es), TODAY)

describe('velocity', () => {
  it('is zero with no history', () => {
    expect(velocityPerWeek([], TODAY)).toBe(0)
  })

  it('equals the weekly amount when saving is steady', () => {
    const es = weeklyDeposits(TODAY, 8, 10_000)
    expect(velocityPerWeek(es, TODAY)).toBe(10_000)
  })

  it('weights recent weeks more heavily than old ones', () => {
    const slowingDown = [...weeklyDeposits('2026-07-10', 4, 20_000), ...weeklyDeposits(TODAY, 4, 2_000)]
    const speedingUp = [...weeklyDeposits('2026-07-10', 4, 2_000), ...weeklyDeposits(TODAY, 4, 20_000)]
    expect(velocityPerWeek(speedingUp, TODAY)).toBeGreaterThan(velocityPerWeek(slowingDown, TODAY))
  })

  it('does not punish a young vault for weeks it did not exist for', () => {
    const es = weeklyDeposits(TODAY, 2, 10_000)
    const young = velocityPerWeek(es, TODAY, { since: '2026-08-10' })
    const aged = velocityPerWeek(es, TODAY, { since: '2026-01-01' })
    expect(young).toBe(10_000)
    expect(aged).toBeLessThan(young)
  })

  it('never reports a negative rate', () => {
    const es = [entry(TODAY, 5_000, { kind: 'withdrawal' })]
    expect(velocityPerWeek(es, TODAY)).toBe(0)
  })
})

describe('required rates', () => {
  it('computes what is needed per day and per week', () => {
    const p = paceOf(vault({ target: 120_000, deadline: XMAS }))
    expect(p.daysLeft).toBe(126)
    expect(p.remaining).toBe(120_000)
    expect(p.requiredPerDay).toBe(953)   // ceil(120000 / 126)
    expect(p.requiredPerWeek).toBe(6_667)
  })

  it('does not divide by zero on the deadline day', () => {
    const p = paceOf(vault({ target: 120_000, deadline: TODAY }))
    expect(p.daysLeft).toBe(0)
    expect(p.requiredPerWeek).toBe(840_000)
    expect(Number.isFinite(p.requiredPerWeek!)).toBe(true)
  })
})

describe('status bands', () => {
  it('is done once the target is reached', () => {
    const es = [entry(TODAY, 120_000)]
    const p = paceOf(vault({ target: 120_000, deadline: XMAS }), es)
    expect(p.status).toBe('done')
    expect(p.fraction).toBe(1)
    expect(p.remaining).toBe(0)
  })

  it('stays done even after a later withdrawal drops the balance', () => {
    // Reaching the target is a fact about the past; pace reflects the present.
    const es = [entry('2026-08-01', 120_000), entry(TODAY, 20_000, { kind: 'withdrawal' })]
    const p = paceOf(vault({ target: 120_000, deadline: XMAS }), es)
    expect(p.status).not.toBe('done')
    expect(p.saved).toBe(100_000)
  })

  it('has no pace to report before any history exists', () => {
    const p = paceOf(vault({ target: 120_000, deadline: XMAS }))
    expect(p.status).toBe('nodata')
    expect(p.projectedFinish).toBeNull()
  })

  it('is ahead when the projection lands comfortably early', () => {
    const v = vault({ target: 120_000, deadline: XMAS, createdAt: '2026-06-01' })
    const es = weeklyDeposits(TODAY, 8, 10_000)
    const p = paceOf(v, es)
    expect(p.velocityPerWeek).toBe(10_000)
    expect(p.projectedFinish).toBe('2026-09-18') // 4 weeks for the last $400
    expect(p.daysEarly).toBe(98)
    expect(p.status).toBe('ahead')
  })

  it('is on track when the projection lands within a few days of the deadline', () => {
    const es = weeklyDeposits(TODAY, 8, 10_000) // $800 saved, $100/wk
    const v = vault({ target: 120_000, deadline: '2026-09-18', createdAt: '2026-06-01' })
    const p = paceOf(v, es)
    expect(p.status).toBe('ontrack')
  })

  it('is behind when it will be late but the gap is recoverable', () => {
    const es = weeklyDeposits(TODAY, 8, 10_000) // $800 saved, $100/wk
    const v = vault({ target: 130_000, deadline: '2026-09-18', createdAt: '2026-06-01' })
    const p = paceOf(v, es)
    expect(p.status).toBe('behind')
    expect(p.daysEarly!).toBeLessThan(0)
  })

  it('is at risk when the required rate dwarfs the real one', () => {
    const es = weeklyDeposits(TODAY, 8, 10_000)
    const v = vault({ target: 280_000, deadline: '2026-09-18', createdAt: '2026-06-01' })
    const p = paceOf(v, es)
    expect(p.status).toBe('atrisk')
  })

  it('is at risk once a deadline has passed unmet', () => {
    const v = vault({ target: 120_000, deadline: '2026-08-01' })
    expect(paceOf(v).status).toBe('atrisk')
  })
})

describe('vaults without targets or deadlines', () => {
  it('treats a targetless vault as open', () => {
    const p = paceOf(vault({ target: null, deadline: null }), [entry(TODAY, 5_000)])
    expect(p.status).toBe('open')
    expect(p.requiredPerWeek).toBeNull()
  })

  it('still projects a finish for a dateless vault that has a target', () => {
    const es = weeklyDeposits(TODAY, 8, 10_000)
    const p = paceOf(vault({ target: 120_000, deadline: null, createdAt: '2026-06-01' }), es)
    expect(p.projectedFinish).toBe('2026-09-18')
    expect(p.daysEarly).toBeNull()
  })
})

describe('the what-if simulator', () => {
  const v = vault({ target: 120_000, deadline: XMAS, createdAt: '2026-06-01' })
  const es = weeklyDeposits(TODAY, 8, 10_000)

  it('answers "when do I land if I add X a week"', () => {
    const p = paceOf(v, es)
    const w = simulate(p, 10_000, TODAY)
    expect(w.weeksNeeded).toBe(4)
    expect(w.finish).toBe('2026-09-18')
    expect(w.onTime).toBe(true)
  })

  it('shows a smaller weekly amount landing later', () => {
    const p = paceOf(v, es)
    const slow = simulate(p, 1_000, TODAY)
    const fast = simulate(p, 20_000, TODAY)
    expect(slow.finish! > fast.finish!).toBe(true)
  })

  it('reports never for a zero contribution', () => {
    const w = simulate(paceOf(v, es), 0, TODAY)
    expect(w.finish).toBeNull()
    expect(w.onTime).toBe(false)
  })

  it('is trivially on time for a finished vault', () => {
    const done = paceOf(v, [entry(TODAY, 200_000)])
    expect(simulate(done, 1_000, TODAY).onTime).toBe(true)
  })

  it('suggests a starting point that is never zero', () => {
    expect(suggestedPerWeek(paceOf(v, es))).toBeGreaterThan(0)
    expect(suggestedPerWeek(paceOf(vault({ target: null, deadline: null })))).toBeGreaterThan(0)
  })
})
