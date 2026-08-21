import type { Cents, Entry, ISODate, Vault } from './types'
import { addDays, daysBetween, isoWeekKey, todayISO, weekStart } from './dates'
import { VELOCITY_WEEKS } from './streak'

/**
 * The pace engine — the reason this app exists.
 *
 * Every savings app draws a bar filling up. Almost none answer the question the
 * user actually has: *am I going to make it?* This module answers it twice —
 * prescriptively ("you need $34/week from here") and predictively ("at your
 * actual recent rate you land on 12 Dec, 13 days early").
 */

export type PaceStatus =
  | 'done'      // target reached
  | 'ahead'     // projected comfortably early
  | 'ontrack'   // projected within a few days of the deadline
  | 'behind'    // projected late, but recoverable
  | 'atrisk'    // projected very late, or the required rate far exceeds the real one
  | 'nodata'    // not enough history to project
  | 'open'      // no target and/or no deadline — nothing to pace against

export type Pace = {
  status: PaceStatus
  saved: Cents
  target: Cents | null
  remaining: Cents
  /** 0–1 of target reached (uncapped ratio available as `rawRatio`). */
  fraction: number
  rawRatio: number
  deadline: ISODate | null
  daysLeft: number | null
  requiredPerDay: Cents | null
  requiredPerWeek: Cents | null
  /** Exponentially-weighted recent rate, in cents per week. */
  velocityPerWeek: Cents
  projectedFinish: ISODate | null
  /** Positive = early, negative = late. */
  daysEarly: number | null
  /** Short human label for a badge. */
  label: string
}

const AHEAD_DAYS = 5
const BEHIND_LIMIT_DAYS = 21
const DECAY = 0.85
/** Anything projected beyond this is "not on any timeline we can draw". */
const MAX_PROJECTION_DAYS = 365 * 12

/**
 * Exponentially-weighted deposits per week over the recent window.
 * Weeks before the vault existed are excluded, so a 2-week-old vault isn't
 * dragged to zero by six weeks of history it was never alive for.
 */
export function velocityPerWeek(
  entries: Entry[],
  today: ISODate = todayISO(),
  opts: { since?: ISODate | null; weeks?: number } = {},
): Cents {
  const weeks = opts.weeks ?? VELOCITY_WEEKS
  const since = opts.since ?? null

  const byWeek = new Map<string, number>()
  for (const e of entries) {
    const signed = e.kind === 'deposit' ? e.amount : -e.amount
    const key = isoWeekKey(e.date)
    byWeek.set(key, (byWeek.get(key) ?? 0) + signed)
  }

  let weighted = 0
  let weightSum = 0
  let cursor = weekStart(today)

  for (let k = 0; k < weeks; k++) {
    if (since && cursor < weekStart(since)) break
    const w = Math.pow(DECAY, k)
    weighted += w * (byWeek.get(isoWeekKey(cursor)) ?? 0)
    weightSum += w
    cursor = addDays(cursor, -7)
  }

  if (weightSum <= 0) return 0
  return Math.max(0, Math.round(weighted / weightSum))
}

export function computePace(
  vault: Vault,
  vaultEntries: Entry[],
  saved: Cents,
  today: ISODate = todayISO(),
): Pace {
  const target = vault.target
  const rawRatio = target && target > 0 ? saved / target : 0
  const fraction = Math.max(0, Math.min(1, rawRatio))
  const remaining = target != null ? Math.max(0, target - saved) : 0
  const velocity = velocityPerWeek(vaultEntries, today, { since: vault.createdAt })

  const base: Pace = {
    status: 'open',
    saved,
    target,
    remaining,
    fraction,
    rawRatio,
    deadline: vault.deadline,
    daysLeft: vault.deadline ? daysBetween(today, vault.deadline) : null,
    requiredPerDay: null,
    requiredPerWeek: null,
    velocityPerWeek: velocity,
    projectedFinish: null,
    daysEarly: null,
    label: 'Open vault',
  }

  if (target != null && target > 0 && saved >= target) {
    return { ...base, status: 'done', remaining: 0, fraction: 1, label: 'Complete' }
  }

  // Projection needs a target; a deadline is optional (an undated vault can
  // still be told when it will land).
  if (target == null || target <= 0) {
    return { ...base, label: velocity > 0 ? 'Growing' : 'Open vault' }
  }

  const projectedFinish =
    velocity > 0
      ? addDays(today, Math.min(MAX_PROJECTION_DAYS, Math.ceil((remaining / velocity) * 7)))
      : null

  if (!vault.deadline) {
    return {
      ...base,
      projectedFinish,
      status: projectedFinish ? 'ontrack' : 'nodata',
      label: projectedFinish ? 'On its way' : 'No pace yet',
    }
  }

  const daysLeft = daysBetween(today, vault.deadline)
  const effectiveDays = Math.max(1, daysLeft)
  const requiredPerDay = Math.ceil(remaining / effectiveDays)
  const requiredPerWeek = Math.ceil((remaining / effectiveDays) * 7)

  const withTargets: Pace = { ...base, daysLeft, requiredPerDay, requiredPerWeek, projectedFinish }

  if (velocity <= 0) {
    return {
      ...withTargets,
      status: daysLeft < 0 ? 'atrisk' : 'nodata',
      label: daysLeft < 0 ? 'Past due' : 'No pace yet',
    }
  }

  const daysEarly = daysBetween(projectedFinish!, vault.deadline)
  const paceGap = requiredPerWeek / velocity

  let status: PaceStatus
  if (daysEarly >= AHEAD_DAYS) status = 'ahead'
  else if (daysEarly >= -AHEAD_DAYS) status = 'ontrack'
  else if (daysEarly >= -BEHIND_LIMIT_DAYS && paceGap <= 2) status = 'behind'
  else status = 'atrisk'

  return {
    ...withTargets,
    daysEarly,
    status,
    label: PACE_LABEL[status],
  }
}

export const PACE_LABEL: Record<PaceStatus, string> = {
  done: 'Complete',
  ahead: 'Ahead',
  ontrack: 'On track',
  behind: 'Behind',
  atrisk: 'At risk',
  nodata: 'No pace yet',
  open: 'Open vault',
}

export const PACE_TONE: Record<PaceStatus, 'good' | 'warn' | 'bad' | 'neutral'> = {
  done: 'good',
  ahead: 'good',
  ontrack: 'good',
  behind: 'warn',
  atrisk: 'bad',
  nodata: 'neutral',
  open: 'neutral',
}

/**
 * The what-if simulator: "if I add {perWeek} every week from today, when do I
 * land, and is that in time?"
 */
export type WhatIf = {
  perWeek: Cents
  finish: ISODate | null
  daysEarly: number | null
  onTime: boolean | null
  weeksNeeded: number | null
}

export function simulate(pace: Pace, perWeek: Cents, today: ISODate = todayISO()): WhatIf {
  if (pace.target == null || pace.remaining <= 0) {
    return { perWeek, finish: null, daysEarly: null, onTime: true, weeksNeeded: 0 }
  }
  if (perWeek <= 0) {
    return { perWeek, finish: null, daysEarly: null, onTime: false, weeksNeeded: null }
  }
  const weeksNeeded = pace.remaining / perWeek
  const days = Math.min(MAX_PROJECTION_DAYS, Math.ceil(weeksNeeded * 7))
  const finish = addDays(today, days)
  const daysEarly = pace.deadline ? daysBetween(finish, pace.deadline) : null
  return {
    perWeek,
    finish,
    daysEarly,
    onTime: daysEarly == null ? null : daysEarly >= 0,
    weeksNeeded: Math.ceil(weeksNeeded),
  }
}

/** A sensible starting position for the what-if slider. */
export function suggestedPerWeek(pace: Pace): Cents {
  if (pace.requiredPerWeek && pace.requiredPerWeek > 0) return pace.requiredPerWeek
  if (pace.velocityPerWeek > 0) return pace.velocityPerWeek
  if (pace.remaining > 0) return Math.max(500, Math.round(pace.remaining / 12 / 100) * 100)
  return 2000
}
