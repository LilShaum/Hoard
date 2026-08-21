import type { ISODate } from './types'
import { isoWeekKey, todayISO, weekStart, addDays, daysBetween, fromISO } from './dates'
import { xpForStreakWeek } from './xp'

/**
 * Streaks, in weeks.
 *
 * Daily streaks are wrong for money — nobody saves every day, and punishing
 * them for it is how habit apps get deleted. The unit here is the ISO week:
 * one deposit any time Mon–Sun keeps it alive. The *current* week can never
 * break the streak, so you always have until Sunday night.
 *
 * Freezes soften the edges further: one is earned every 4 weeks (banked up to
 * 2) and spent automatically on the first week you miss. A frozen week
 * preserves the streak without extending it — you keep what you built, you
 * just don't get credit for a week you didn't save.
 */

export const FREEZE_EARN_EVERY = 4
export const MAX_FREEZES = 2
export const VELOCITY_WEEKS = 8

export type StreakInfo = {
  /** Consecutive weeks with a deposit (frozen weeks preserve but don't add). */
  current: number
  longest: number
  /** Freezes banked and ready to spend. */
  freezes: number
  /** Weeks of saving until the next freeze is earned. */
  weeksToNextFreeze: number
  /** Has a deposit landed in the current week? */
  weekActive: boolean
  /** ISO week keys that a freeze rescued, most recent last. */
  frozenWeeks: string[]
  lastActiveWeek: string | null
  /** Distinct calendar days with a deposit, all time. */
  activeDays: number
  /** Total weeks with at least one deposit, all time. */
  activeWeeks: number
  /** No deposit yet this week and the week is more than half gone. */
  atRisk: boolean
  /** Lifetime XP earned from surviving weeks — accumulated during the walk. */
  totalStreakXp: number
}

export const EMPTY_STREAK: StreakInfo = {
  current: 0,
  longest: 0,
  freezes: 0,
  weeksToNextFreeze: FREEZE_EARN_EVERY,
  weekActive: false,
  frozenWeeks: [],
  lastActiveWeek: null,
  activeDays: 0,
  activeWeeks: 0,
  atRisk: false,
  totalStreakXp: 0,
}

/**
 * @param depositDays ISO dates that had at least one deposit (duplicates fine).
 */
export function computeStreak(depositDays: ISODate[], today: ISODate = todayISO()): StreakInfo {
  const days = new Set(depositDays)
  if (days.size === 0) return { ...EMPTY_STREAK }

  const sorted = [...days].sort()
  const first = sorted[0]
  const activeWeekKeys = new Set(sorted.map(isoWeekKey))
  const thisWeek = isoWeekKey(today)

  // Walk forward one week at a time from the first deposit to now, simulating
  // the streak as it actually played out. Forward is the only direction that
  // can model freeze *earning* correctly.
  let cursor = weekStart(first)
  const end = weekStart(today)

  let current = 0
  let longest = 0
  let freezes = 0
  let sinceEarn = 0
  let totalStreakXp = 0
  const frozenWeeks: string[] = []
  let lastActiveWeek: string | null = null

  let guard = 0
  while (cursor <= end && guard++ < 5200 /* ~100 years */) {
    const key = isoWeekKey(cursor)
    const isCurrentWeek = key === thisWeek
    const active = activeWeekKeys.has(key)

    if (active) {
      current += 1
      lastActiveWeek = key
      sinceEarn += 1
      if (sinceEarn >= FREEZE_EARN_EVERY) {
        sinceEarn = 0
        freezes = Math.min(MAX_FREEZES, freezes + 1)
      }
      if (current > longest) longest = current
      totalStreakXp += xpForStreakWeek(current)
    } else if (isCurrentWeek) {
      // The week isn't over. Nothing has been missed yet.
    } else if (freezes > 0 && current > 0) {
      freezes -= 1
      frozenWeeks.push(key)
      // Streak preserved, not extended.
    } else {
      current = 0
      freezes = 0
      sinceEarn = 0
    }

    cursor = addDays(cursor, 7)
  }

  const dowMon0 = (fromISO(today).getDay() + 6) % 7
  const weekActive = activeWeekKeys.has(thisWeek)

  return {
    current,
    longest,
    freezes,
    weeksToNextFreeze:
      freezes >= MAX_FREEZES ? 0 : Math.max(1, FREEZE_EARN_EVERY - sinceEarn),
    weekActive,
    frozenWeeks,
    lastActiveWeek,
    activeDays: days.size,
    activeWeeks: activeWeekKeys.size,
    atRisk: !weekActive && dowMon0 >= 4 && current > 0,
    totalStreakXp,
  }
}

/** Days since the last deposit — drives the "comeback" achievement and nudges. */
export function daysSinceLastDeposit(
  depositDays: ISODate[],
  today: ISODate = todayISO(),
): number | null {
  if (depositDays.length === 0) return null
  const last = depositDays.reduce((a, b) => (a > b ? a : b))
  return Math.max(0, daysBetween(last, today))
}
