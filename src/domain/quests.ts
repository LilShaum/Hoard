import type { Cents, Entry, ISODate, Vault } from './types'
import {
  addDays, isoWeekKey, monthEnd, monthKey, monthStart, weekEnd, weekStart,
} from './dates'
import { depositsOf, netOf } from './stats'
import { seeded, shuffle } from './rng'
import { XP_QUEST } from './xp'

/**
 * Quests are generated **deterministically** from a seeded PRNG keyed on the
 * period ('2026-W34'), so they're identical on every reload and can't be
 * rerolled by refreshing. Progress is derived from entries; the only thing ever
 * written to storage is the fact that a reward was claimed.
 *
 * Money targets scale off the user's own median week, so the same quest text is
 * achievable for someone saving $20/wk and still means something at $500/wk.
 */

export type QuestTier = 'daily' | 'weekly' | 'monthly'
export type QuestUnit = 'money' | 'count'

export type Quest = {
  id: string
  tier: QuestTier
  kind: string
  title: string
  detail: string
  unit: QuestUnit
  target: number
  progress: number
  fraction: number
  done: boolean
  claimed: boolean
  claimable: boolean
  xp: number
  periodKey: string
  expiresAt: ISODate
}

export type QuestContext = {
  today: ISODate
  entries: Entry[]
  vaults: Vault[]
  monthlyTarget: Cents
  claimed: Record<string, ISODate>
}

/** Rounds a money target to something a human would have chosen. */
export function niceMoney(cents: Cents): Cents {
  const units = cents / 100
  const step =
    units <= 20 ? 5 : units <= 60 ? 10 : units <= 200 ? 25 : units <= 600 ? 50 :
    units <= 2000 ? 100 : units <= 6000 ? 250 : 500
  return Math.max(step * 100, Math.round(units / step) * step * 100)
}

function medianWeek(entries: Entry[]): Cents {
  const m = new Map<string, number>()
  for (const e of entries) {
    if (e.kind !== 'deposit') continue
    const k = isoWeekKey(e.date)
    m.set(k, (m.get(k) ?? 0) + e.amount)
  }
  const vals = [...m.values()].filter((v) => v > 0).sort((a, b) => a - b)
  if (vals.length === 0) return 0
  return vals[Math.floor(vals.length / 2)]
}

/** The per-week yardstick every dynamic target is derived from. */
function baseline(entries: Entry[], monthlyTarget: Cents): Cents {
  const med = medianWeek(entries)
  if (med > 0) return med
  if (monthlyTarget > 0) return Math.round(monthlyTarget / 4.33)
  return 2500 // $25/wk — a gentle place to start
}

const inRange = (e: Entry, from: ISODate, to: ISODate) => e.date >= from && e.date <= to
const distinctDays = (es: Entry[]) => new Set(es.map((e) => e.date)).size
const distinctVaults = (es: Entry[]) => new Set(es.map((e) => e.vaultId ?? '_general')).size

type Built = { kind: string; title: string; detail: string; unit: QuestUnit; target: number; progress: number }

/* ------------------------------------------------------------------ daily */

function dailyPool(ctx: QuestContext, base: Cents): Built[] {
  const { today, entries } = ctx
  const todays = entries.filter((e) => e.date === today && e.kind === 'deposit')
  const yesterday = addDays(today, -1)
  const yTotal = depositsOf(entries.filter((e) => e.date === yesterday))
  const perDay = Math.max(500, niceMoney(Math.round(base / 4)))
  const datedIds = new Set(ctx.vaults.filter((v) => v.deadline && !v.archived).map((v) => v.id))

  return [
    {
      kind: 'any', title: 'Feed the hoard',
      detail: 'Log any deposit today.',
      unit: 'count', target: 1, progress: Math.min(1, todays.length),
    },
    {
      kind: 'amount', title: 'Daily drop',
      detail: `Put aside ${'{money}'} today.`,
      unit: 'money', target: perDay, progress: depositsOf(todays),
    },
    {
      kind: 'beat_yesterday', title: 'Beat yesterday',
      detail: yTotal > 0 ? `Save more than yesterday's ${'{money}'}.` : `Save ${'{money}'} today.`,
      unit: 'money', target: yTotal > 0 ? yTotal + 1 : perDay, progress: depositsOf(todays),
    },
    {
      kind: 'dated', title: 'Mind the deadline',
      detail: 'Add to a vault that has a due date.',
      unit: 'count', target: 1,
      progress: Math.min(1, todays.filter((e) => e.vaultId && datedIds.has(e.vaultId)).length),
    },
    {
      kind: 'twice', title: 'Double drop',
      detail: 'Log two separate deposits today.',
      unit: 'count', target: 2, progress: Math.min(2, todays.length),
    },
  ]
}

/* ----------------------------------------------------------------- weekly */

function weeklyPool(ctx: QuestContext, base: Cents): Built[] {
  const { today, entries } = ctx
  const from = weekStart(today)
  const to = weekEnd(today)
  const week = entries.filter((e) => inRange(e, from, to))
  const weekDeposits = week.filter((e) => e.kind === 'deposit')
  const lastFrom = addDays(from, -7)
  const lastTotal = depositsOf(entries.filter((e) => inRange(e, lastFrom, addDays(from, -1))))
  const biggest = weekDeposits.reduce((a, e) => Math.max(a, e.amount), 0)

  return [
    {
      kind: 'days', title: 'Three touches',
      detail: 'Deposit on 3 different days this week.',
      unit: 'count', target: 3, progress: Math.min(3, distinctDays(weekDeposits)),
    },
    {
      kind: 'amount', title: "Week's haul",
      detail: `Save ${'{money}'} before Sunday night.`,
      unit: 'money', target: niceMoney(Math.round(base * 1.1)), progress: depositsOf(weekDeposits),
    },
    {
      kind: 'vaults', title: 'Spread the gold',
      detail: 'Add to 2 different vaults this week.',
      unit: 'count', target: 2, progress: Math.min(2, distinctVaults(weekDeposits)),
    },
    {
      kind: 'beat_last', title: 'Outdo last week',
      detail: lastTotal > 0 ? `Beat last week's ${'{money}'}.` : `Save ${'{money}'} this week.`,
      unit: 'money', target: lastTotal > 0 ? lastTotal + 1 : niceMoney(base),
      progress: depositsOf(weekDeposits),
    },
    {
      kind: 'clean', title: 'Nothing back out',
      detail: 'Get through the week without a withdrawal.',
      unit: 'count', target: 1,
      progress: weekDeposits.length > 0 && week.every((e) => e.kind === 'deposit') ? 1 : 0,
    },
    {
      kind: 'big', title: 'One big one',
      detail: `Land a single deposit of ${'{money}'} or more.`,
      unit: 'money', target: niceMoney(Math.round(base * 0.6)), progress: biggest,
    },
  ]
}

/* ---------------------------------------------------------------- monthly */

function monthlyPool(ctx: QuestContext, base: Cents): Built[] {
  const { today, entries, monthlyTarget } = ctx
  const from = monthStart(today)
  const to = monthEnd(today)
  const month = entries.filter((e) => inRange(e, from, to))
  const monthDeposits = month.filter((e) => e.kind === 'deposit')
  const target = monthlyTarget > 0 ? monthlyTarget : niceMoney(base * 4)

  return [
    {
      kind: 'target', title: 'Monthly target',
      detail: `Reach ${'{money}'} saved this month.`,
      unit: 'money', target, progress: Math.max(0, netOf(month)),
    },
    {
      kind: 'days', title: 'Ten good days',
      detail: 'Deposit on 10 different days this month.',
      unit: 'count', target: 10, progress: Math.min(10, distinctDays(monthDeposits)),
    },
    {
      kind: 'stretch', title: 'Overachiever',
      detail: `Push past ${'{money}'} — 125% of target.`,
      unit: 'money', target: Math.round(target * 1.25), progress: Math.max(0, netOf(month)),
    },
  ]
}

/* -------------------------------------------------------------- assembly */

function build(
  built: Built,
  tier: QuestTier,
  periodKey: string,
  expiresAt: ISODate,
  claimed: Record<string, ISODate>,
): Quest {
  const id = `${periodKey}:${tier}:${built.kind}`
  const done = built.progress >= built.target
  const isClaimed = id in claimed
  return {
    id,
    tier,
    kind: built.kind,
    title: built.title,
    detail: built.detail,
    unit: built.unit,
    target: built.target,
    progress: Math.min(built.progress, built.target),
    fraction: built.target > 0 ? Math.min(1, built.progress / built.target) : 0,
    done,
    claimed: isClaimed,
    claimable: done && !isClaimed,
    xp: XP_QUEST[tier],
    periodKey,
    expiresAt,
  }
}

export const QUEST_COUNT: Record<QuestTier, number> = { daily: 1, weekly: 3, monthly: 2 }

export function generateQuests(ctx: QuestContext): Quest[] {
  const base = baseline(ctx.entries, ctx.monthlyTarget)
  const dayKey = ctx.today
  const wkKey = isoWeekKey(ctx.today)
  const moKey = monthKey(ctx.today)

  const daily = shuffle(dailyPool(ctx, base), seeded(`d:${dayKey}`))
    .slice(0, QUEST_COUNT.daily)
    .map((b) => build(b, 'daily', dayKey, ctx.today, ctx.claimed))

  const weekly = shuffle(weeklyPool(ctx, base), seeded(`w:${wkKey}`))
    .slice(0, QUEST_COUNT.weekly)
    .map((b) => build(b, 'weekly', wkKey, weekEnd(ctx.today), ctx.claimed))

  // The monthly target always shows; the second slot rotates.
  const monthPool = monthlyPool(ctx, base)
  const fixed = monthPool[0]
  const rotating = shuffle(monthPool.slice(1), seeded(`m:${moKey}`))[0]
  const monthly = [fixed, rotating].map((b) =>
    build(b, 'monthly', moKey, monthEnd(ctx.today), ctx.claimed))

  return [...daily, ...weekly, ...monthly]
}

/** XP already banked from claimed quests, inferred from their ids. */
export function claimedQuestXp(claimed: Record<string, ISODate>): number {
  let xp = 0
  for (const id of Object.keys(claimed)) {
    const tier = id.split(':')[1] as QuestTier | undefined
    if (tier && tier in XP_QUEST) xp += XP_QUEST[tier]
  }
  return xp
}

/**
 * Quest `detail` carries a `{money}` placeholder so the target can be rendered
 * in the user's own currency at display time rather than baked in at generation.
 */
export function questDetail(q: Quest, money: (c: number) => string): string {
  return q.detail.replace('{money}', q.unit === 'money' ? money(q.target) : String(q.target))
}
