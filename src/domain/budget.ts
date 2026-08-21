import type { Cents, Entry, ISODate } from './types'
import { addDays, daysBetween, isoWeekKey, todayISO, weekEnd, weekStart } from './dates'
import { spendOf } from './stats'

/**
 * The weekly spending limit.
 *
 * A savings tracker that only counts what goes in tells half the story: the
 * reason a month misses its deposit goal is almost always what left the
 * everyday account, not what failed to arrive. So spending is tracked against
 * a weekly cap — weekly rather than monthly because a week is short enough to
 * course-correct inside, and long enough that one big shop doesn't feel fatal.
 *
 * The number that actually changes behaviour is not "spent so far" but
 * **safe to spend today**: what's left, divided by the days still to come.
 */

export type BudgetStatus = 'unset' | 'clear' | 'close' | 'over'

export type BudgetView = {
  limit: Cents
  spent: Cents
  remaining: Cents
  /** 0–1 of the limit used; can exceed 1 in `rawFraction`. */
  fraction: number
  rawFraction: number
  /** Days left in the week, counting today. */
  daysLeft: number
  /** Remaining budget spread over the days still to come, today included. */
  safePerDay: Cents
  /** Where an evenly-paced week would have you by now, 0–1. */
  expectedFraction: number
  status: BudgetStatus
  weekStart: ISODate
  weekEnd: ISODate
  /** Consecutive completed weeks finished at or under the limit. */
  streak: number
  /** Spending per day of the current week, Monday first, for the sparkline. */
  perDay: Array<{ date: ISODate; value: Cents }>
}

export const EMPTY_BUDGET: BudgetView = {
  limit: 0, spent: 0, remaining: 0, fraction: 0, rawFraction: 0,
  daysLeft: 7, safePerDay: 0, expectedFraction: 0, status: 'unset',
  weekStart: '', weekEnd: '', streak: 0, perDay: [],
}

/** Warn once four fifths of the week's budget is gone. */
const CLOSE_AT = 0.8

export function computeBudget(
  entries: Entry[],
  limit: Cents,
  today: ISODate = todayISO(),
): BudgetView {
  const from = weekStart(today)
  const to = weekEnd(today)
  const week = entries.filter((e) => e.kind === 'spend' && e.date >= from && e.date <= to)
  const spent = spendOf(week)

  // Today still counts as a day you can spend in, so the divisor is inclusive.
  const daysLeft = Math.max(1, daysBetween(today, to) + 1)
  const dayIndex = daysBetween(from, today) + 1

  const perDayMap = new Map<ISODate, Cents>()
  for (const e of week) perDayMap.set(e.date, (perDayMap.get(e.date) ?? 0) + e.amount)
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i)
    return { date, value: perDayMap.get(date) ?? 0 }
  })

  if (limit <= 0) {
    return { ...EMPTY_BUDGET, spent, daysLeft, weekStart: from, weekEnd: to, perDay }
  }

  const remaining = Math.max(0, limit - spent)
  const rawFraction = spent / limit

  return {
    limit,
    spent,
    remaining,
    fraction: Math.min(1, rawFraction),
    rawFraction,
    daysLeft,
    safePerDay: Math.floor(remaining / daysLeft),
    expectedFraction: Math.min(1, dayIndex / 7),
    status: rawFraction > 1 ? 'over' : rawFraction >= CLOSE_AT ? 'close' : 'clear',
    weekStart: from,
    weekEnd: to,
    streak: underBudgetStreak(entries, limit, today),
    perDay,
  }
}

/** Spend per ISO week, for the history chart. Oldest first, zero-filled. */
export function weeklySpend(
  entries: Entry[],
  count = 8,
  today: ISODate = todayISO(),
): Array<{ key: string; start: ISODate; value: Cents }> {
  const byWeek = new Map<string, Cents>()
  for (const e of entries) {
    if (e.kind !== 'spend') continue
    const k = isoWeekKey(e.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + e.amount)
  }
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(weekStart(today), -7 * (count - 1 - i))
    const key = isoWeekKey(start)
    return { key, start, value: byWeek.get(key) ?? 0 }
  })
}

/**
 * Consecutive *completed* weeks that finished at or under the limit. The
 * current week is excluded — it isn't over, and a streak you can still lose
 * today is not a streak you've earned.
 */
export function underBudgetStreak(
  entries: Entry[],
  limit: Cents,
  today: ISODate = todayISO(),
): number {
  if (limit <= 0) return 0

  const byWeek = new Map<string, Cents>()
  let earliest: ISODate | null = null
  for (const e of entries) {
    if (e.kind !== 'spend') continue
    const k = isoWeekKey(e.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + e.amount)
    if (!earliest || e.date < earliest) earliest = e.date
  }
  if (!earliest) return 0

  const first = weekStart(earliest)
  let cursor = addDays(weekStart(today), -7)
  let streak = 0

  while (cursor >= first) {
    const spent = byWeek.get(isoWeekKey(cursor)) ?? 0
    // A week with no spending logged at all is not evidence of restraint.
    if (spent <= 0 || spent > limit) break
    streak += 1
    cursor = addDays(cursor, -7)
  }
  return streak
}

/** Completed weeks that came in at or under the limit, all time. */
export function weeksUnderLimit(
  entries: Entry[],
  limit: Cents,
  today: ISODate = todayISO(),
): number {
  if (limit <= 0) return 0
  const thisWeek = isoWeekKey(today)
  const byWeek = new Map<string, Cents>()
  for (const e of entries) {
    if (e.kind !== 'spend') continue
    const k = isoWeekKey(e.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + e.amount)
  }
  let n = 0
  for (const [key, spent] of byWeek) {
    if (key !== thisWeek && spent > 0 && spent <= limit) n++
  }
  return n
}

export const BUDGET_LABEL: Record<BudgetStatus, string> = {
  unset: 'No limit set',
  clear: 'On budget',
  close: 'Running close',
  over: 'Over budget',
}
