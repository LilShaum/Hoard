import { describe, expect, it } from 'vitest'
import { computeStreak, daysSinceLastDeposit, MAX_FREEZES } from '../streak'

/**
 * Anchor: 2026-08-21 is a Friday. Its ISO week runs Mon 2026-08-17 → Sun 08-23.
 *   W0  = 08-17   (current)
 *   W-1 = 08-10
 *   W-2 = 08-03
 *   W-3 = 07-27
 *   W-4 = 07-20
 *   W-5 = 07-13
 */
const TODAY = '2026-08-21'

describe('an empty history', () => {
  it('has no streak and no freezes', () => {
    const s = computeStreak([], TODAY)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(0)
    expect(s.freezes).toBe(0)
    expect(s.activeDays).toBe(0)
    expect(s.atRisk).toBe(false)
  })
})

describe('counting weeks', () => {
  it('counts a single active week', () => {
    const s = computeStreak(['2026-08-19'], TODAY)
    expect(s.current).toBe(1)
    expect(s.weekActive).toBe(true)
  })

  it('counts consecutive weeks', () => {
    const s = computeStreak(['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-21'], TODAY)
    expect(s.current).toBe(4)
    expect(s.longest).toBe(4)
  })

  it('counts a week once no matter how many deposits it holds', () => {
    const s = computeStreak(['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20'], TODAY)
    expect(s.current).toBe(1)
    expect(s.activeDays).toBe(4)
    expect(s.activeWeeks).toBe(1)
  })

  it('ignores duplicate days', () => {
    const s = computeStreak(['2026-08-19', '2026-08-19', '2026-08-19'], TODAY)
    expect(s.activeDays).toBe(1)
  })
})

describe('the current week is never a broken week', () => {
  it('keeps the streak alive when nothing has been saved yet this week', () => {
    const s = computeStreak(['2026-07-27', '2026-08-03', '2026-08-10'], TODAY)
    expect(s.current).toBe(3)
    expect(s.weekActive).toBe(false)
  })

  it('flags it as at risk once the week is more than half gone', () => {
    // Friday, three days left, nothing banked.
    expect(computeStreak(['2026-08-10'], TODAY).atRisk).toBe(true)
    // Tuesday of the same week — plenty of time, no nagging.
    expect(computeStreak(['2026-08-10'], '2026-08-18').atRisk).toBe(false)
  })

  it('never flags risk when there is no streak to lose', () => {
    expect(computeStreak([], TODAY).atRisk).toBe(false)
  })
})

describe('breaking and rebuilding', () => {
  it('resets after a missed week when no freeze is banked', () => {
    // Two weeks (not enough to earn a freeze), a gap, then this week.
    const s = computeStreak(['2026-07-13', '2026-07-20', '2026-08-21'], TODAY)
    expect(s.current).toBe(1)
    expect(s.longest).toBe(2)
  })

  it('remembers the best run even after a reset', () => {
    const s = computeStreak(
      ['2026-05-04', '2026-05-11', '2026-05-18', '2026-08-21'], TODAY)
    expect(s.longest).toBe(3)
    expect(s.current).toBe(1)
  })
})

describe('freezes', () => {
  it('earns one every four weeks', () => {
    const s = computeStreak(['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-21'], TODAY)
    expect(s.freezes).toBe(1)
    expect(s.weeksToNextFreeze).toBe(4)
  })

  it('does not earn one before four weeks', () => {
    const s = computeStreak(['2026-08-03', '2026-08-10', '2026-08-21'], TODAY)
    expect(s.freezes).toBe(0)
    expect(s.weeksToNextFreeze).toBe(1)
  })

  it('spends a freeze automatically to rescue a missed week', () => {
    // Four weeks earn a freeze, W-1 is missed, then this week.
    const s = computeStreak(
      ['2026-07-13', '2026-07-20', '2026-07-27', '2026-08-03', '2026-08-21'], TODAY)
    expect(s.frozenWeeks).toHaveLength(1)
    expect(s.freezes).toBe(0)
    // A freeze preserves the streak without extending it: 4 survived + 1 new.
    expect(s.current).toBe(5)
  })

  it('resets once the banked freezes run out', () => {
    // Four weeks (1 freeze), then two missed weeks: the first is frozen, the
    // second cannot be, so the streak dies.
    const s = computeStreak(
      ['2026-06-29', '2026-07-06', '2026-07-13', '2026-07-20', '2026-08-21'], TODAY)
    expect(s.current).toBe(1)
    expect(s.freezes).toBe(0)
  })

  it('never banks more than the cap', () => {
    const days: string[] = []
    for (let i = 0; i < 40; i++) {
      const d = new Date('2026-08-21T00:00:00')
      d.setDate(d.getDate() - 7 * i)
      days.push(d.toISOString().slice(0, 10))
    }
    const s = computeStreak(days, TODAY)
    expect(s.current).toBe(40)
    expect(s.freezes).toBeLessThanOrEqual(MAX_FREEZES)
  })
})

describe('streak XP', () => {
  it('accumulates as the streak survives', () => {
    const one = computeStreak(['2026-08-21'], TODAY)
    const four = computeStreak(['2026-07-27', '2026-08-03', '2026-08-10', '2026-08-21'], TODAY)
    expect(one.totalStreakXp).toBe(30)
    expect(four.totalStreakXp).toBe(30 + 35 + 40 + 45)
  })
})

describe('daysSinceLastDeposit', () => {
  it('measures the gap', () => {
    expect(daysSinceLastDeposit(['2026-08-14', '2026-08-18'], TODAY)).toBe(3)
    expect(daysSinceLastDeposit(['2026-08-21'], TODAY)).toBe(0)
    expect(daysSinceLastDeposit([], TODAY)).toBeNull()
  })
})
