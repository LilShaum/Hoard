import { describe, expect, it } from 'vitest'
import { computeBudget, underBudgetStreak, weeklySpend, weeksUnderLimit } from '../budget'
import { derive } from '../selectors'
import { entry, state, vault } from './factory'

/** 2026-08-21 is a Friday; its ISO week is Mon 08-17 → Sun 08-23. */
const TODAY = '2026-08-21'
const LIMIT = 15_000 // $150 a week
const spend = (date: string, amount: number) => entry(date, amount, { kind: 'spend' })

describe('a limit that has not been set', () => {
  it('reports unset rather than dividing by zero', () => {
    const b = computeBudget([spend(TODAY, 5_000)], 0, TODAY)
    expect(b.status).toBe('unset')
    expect(b.fraction).toBe(0)
    expect(b.safePerDay).toBe(0)
    expect(Number.isFinite(b.rawFraction)).toBe(true)
  })

  it('still totals the spending, so the number is ready when a limit is set', () => {
    expect(computeBudget([spend(TODAY, 5_000)], 0, TODAY).spent).toBe(5_000)
  })
})

describe('spending against the limit', () => {
  it('counts only this week', () => {
    const b = computeBudget(
      [spend('2026-08-17', 3_000), spend(TODAY, 2_000), spend('2026-08-10', 90_000)],
      LIMIT, TODAY)
    expect(b.spent).toBe(5_000)
    expect(b.remaining).toBe(10_000)
  })

  it('ignores deposits and withdrawals entirely', () => {
    const b = computeBudget(
      [entry(TODAY, 50_000), entry(TODAY, 20_000, { kind: 'withdrawal' }), spend(TODAY, 1_000)],
      LIMIT, TODAY)
    expect(b.spent).toBe(1_000)
  })

  it('spreads what is left over the days still to come, today included', () => {
    // Friday: today, Saturday, Sunday = 3 days left.
    const b = computeBudget([spend(TODAY, 6_000)], LIMIT, TODAY)
    expect(b.daysLeft).toBe(3)
    expect(b.safePerDay).toBe(3_000)
  })

  it('gives the whole limit across seven days on a Monday', () => {
    const b = computeBudget([], LIMIT, '2026-08-17')
    expect(b.daysLeft).toBe(7)
    expect(b.safePerDay).toBe(Math.floor(LIMIT / 7))
  })

  it('never suggests a negative daily allowance', () => {
    const b = computeBudget([spend(TODAY, 90_000)], LIMIT, TODAY)
    expect(b.remaining).toBe(0)
    expect(b.safePerDay).toBe(0)
  })
})

describe('status bands', () => {
  const at = (amount: number) => computeBudget([spend(TODAY, amount)], LIMIT, TODAY).status

  it('is clear well inside the limit', () => {
    expect(at(1_000)).toBe('clear')
    expect(at(11_000)).toBe('clear')
  })

  it('warns once four fifths is gone', () => {
    expect(at(12_000)).toBe('close')
    expect(at(15_000)).toBe('close')
  })

  it('is over only when the limit is actually exceeded', () => {
    expect(at(15_001)).toBe('over')
    expect(at(40_000)).toBe('over')
  })

  it('caps the displayed fraction but keeps the true overspend available', () => {
    const b = computeBudget([spend(TODAY, 30_000)], LIMIT, TODAY)
    expect(b.fraction).toBe(1)
    expect(b.rawFraction).toBe(2)
  })
})

describe('the daily breakdown', () => {
  it('is always seven days, Monday first', () => {
    const b = computeBudget([spend('2026-08-19', 4_000)], LIMIT, TODAY)
    expect(b.perDay).toHaveLength(7)
    expect(b.perDay[0].date).toBe('2026-08-17')
    expect(b.perDay[6].date).toBe('2026-08-23')
    expect(b.perDay[2].value).toBe(4_000)
    expect(b.perDay[0].value).toBe(0)
  })
})

describe('the under-budget streak', () => {
  it('is zero with no history', () => {
    expect(underBudgetStreak([], LIMIT, TODAY)).toBe(0)
  })

  it('counts completed weeks that came in under', () => {
    const s = [spend('2026-08-10', 9_000), spend('2026-08-03', 9_000), spend('2026-07-27', 9_000)]
    expect(underBudgetStreak(s, LIMIT, TODAY)).toBe(3)
  })

  it('excludes the current week, which is not over yet', () => {
    const s = [spend(TODAY, 100), spend('2026-08-10', 9_000)]
    expect(underBudgetStreak(s, LIMIT, TODAY)).toBe(1)
  })

  it('stops at the first week that went over', () => {
    const s = [spend('2026-08-10', 9_000), spend('2026-08-03', 90_000), spend('2026-07-27', 9_000)]
    expect(underBudgetStreak(s, LIMIT, TODAY)).toBe(1)
  })

  it('does not count a week with nothing logged as restraint', () => {
    // Nothing at all in the week of 08-10 — that is missing data, not a win.
    const s = [spend('2026-08-03', 9_000)]
    expect(underBudgetStreak(s, LIMIT, TODAY)).toBe(0)
  })

  it('is zero when no limit is set', () => {
    expect(underBudgetStreak([spend('2026-08-10', 9_000)], 0, TODAY)).toBe(0)
  })
})

describe('weeksUnderLimit', () => {
  it('counts every completed week that came in at or under', () => {
    const s = [spend('2026-08-10', 9_000), spend('2026-08-03', 90_000), spend('2026-07-27', 15_000)]
    expect(weeksUnderLimit(s, LIMIT, TODAY)).toBe(2)
  })

  it('never counts the current week', () => {
    expect(weeksUnderLimit([spend(TODAY, 100)], LIMIT, TODAY)).toBe(0)
  })
})

describe('weeklySpend history', () => {
  it('zero-fills and ends on the current week', () => {
    const series = weeklySpend([spend(TODAY, 4_000)], 4, TODAY)
    expect(series).toHaveLength(4)
    expect(series[3].key).toBe('2026-W34')
    expect(series[3].value).toBe(4_000)
    expect(series[0].value).toBe(0)
  })
})

describe('spending and the hoard', () => {
  const withLimit = (entries: ReturnType<typeof entry>[]) => {
    const s = state({ entries })
    s.profile.weeklyLimit = LIMIT
    return derive(s, TODAY)
  }

  it('never changes the savings total', () => {
    const r = withLimit([entry(TODAY, 50_000), spend(TODAY, 12_000)])
    expect(r.totalSaved).toBe(50_000)
    expect(r.totalSpent).toBe(12_000)
  })

  it('never counts towards the monthly deposit goal', () => {
    const r = withLimit([entry(TODAY, 10_000), spend(TODAY, 90_000)])
    expect(r.month.saved).toBe(10_000)
  })

  it('never earns deposit XP', () => {
    const withSpend = withLimit([entry(TODAY, 10_000), spend(TODAY, 90_000)])
    const without = withLimit([entry(TODAY, 10_000)])
    expect(withSpend.xp.deposits).toBe(without.xp.deposits)
  })

  it('never lands in a vault, even if an import claimed it did', () => {
    const s = state({
      vaults: [vault({ id: 'v1' })],
      entries: [entry(TODAY, 5_000, { vaultId: 'v1' }), entry(TODAY, 9_000, { vaultId: 'v1', kind: 'spend' })],
    })
    expect(derive(s, TODAY).vaultById.get('v1')!.saved).toBe(5_000)
  })

  it('does not break the saving streak', () => {
    const r = withLimit([entry(TODAY, 5_000), spend(TODAY, 90_000)])
    expect(r.streak.current).toBe(1)
  })

  it('surfaces the budget on the derived view', () => {
    const r = withLimit([spend(TODAY, 6_000)])
    expect(r.budget.limit).toBe(LIMIT)
    expect(r.budget.spent).toBe(6_000)
    expect(r.budget.status).toBe('clear')
  })
})
