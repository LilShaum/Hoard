import type { Cents, Entry, ISODate } from './types'
import type { VaultView } from './selectors'
import { addDays, daysBetween, isoWeekKey, todayISO, weekStart } from './dates'

/**
 * The Bank, and the weekly split.
 *
 * The problem this solves, in the words of the person who asked for it:
 * "when I deposit a check of 600 dollars, the vaults stay at 0". Money arrives
 * in one lump and goals are funded in small weekly amounts, and nothing joined
 * those two facts together.
 *
 * So: money not tied to a vault is the **Bank**. Each vault already knows what
 * it needs per week to land on time. A distribution moves one week of that need
 * out of the Bank and into the vaults.
 *
 * Two rules keep it honest:
 *  - It never invents money. The plan is capped by the Bank balance, and a
 *    short Bank is filled in deadline order — the most urgent vault first —
 *    rather than by starving everything equally.
 *  - It never runs on its own. It is offered when a new week starts and taken
 *    with one tap. Software that moves someone's money while they are not
 *    looking is software they stop trusting.
 */

export type Allocation = {
  vaultId: string
  name: string
  /** What this vault needs each week to land on its deadline. */
  needPerWeek: Cents
  /** What it will actually get, once the Bank balance runs out. */
  amount: Cents
  /** Short of its need because the Bank could not cover it. */
  short: boolean
}

export type Plan = {
  /** Money available in the Bank right now. */
  bank: Cents
  allocations: Allocation[]
  /** Sum of what will actually move. */
  total: Cents
  /** Sum of what every vault wanted, before the Bank capped it. */
  needed: Cents
  /** The Bank covered every vault's full weekly need. */
  covered: boolean
  /** Nothing to move: no bank, no dated vaults, or nothing needed. */
  empty: boolean
}

export const EMPTY_PLAN: Plan = {
  bank: 0, allocations: [], total: 0, needed: 0, covered: true, empty: true,
}

/**
 * Vaults are funded in order of urgency, measured by how soon they are due.
 * An undated vault has no weekly need at all — there is no date to pace
 * against — so it is never part of an automatic split.
 */
function fundingOrder(vaults: VaultView[]): VaultView[] {
  return vaults
    .filter((v) => !v.archived && !v.isComplete && v.deadline != null && v.target != null)
    .filter((v) => (v.pace.requiredPerWeek ?? 0) > 0)
    .sort((a, b) => (a.deadline! < b.deadline! ? -1 : a.deadline! > b.deadline! ? 1 : 0))
}

export function planDistribution(vaults: VaultView[], bank: Cents): Plan {
  const cappedBank = Math.max(0, bank)
  const eligible = fundingOrder(vaults)
  // `empty` tracks whether there is any weekly need at all, not whether the
  // Bank happens to be empty right now — an empty Bank against real need is a
  // "top me up" state, not a "nothing to do here" state.
  if (eligible.length === 0) return { ...EMPTY_PLAN, bank: cappedBank }

  let left = cappedBank
  let needed = 0
  const allocations: Allocation[] = []

  for (const v of eligible) {
    // Never move more than the vault still needs in total — overshooting the
    // target would take money out of the Bank for no reason.
    const need = Math.min(v.pace.requiredPerWeek ?? 0, v.pace.remaining)
    if (need <= 0) continue
    needed += need
    const amount = Math.min(need, left)
    left -= amount
    if (amount > 0) {
      allocations.push({
        vaultId: v.id,
        name: v.name,
        needPerWeek: need,
        amount,
        short: amount < need,
      })
    }
  }

  const total = allocations.reduce((n, a) => n + a.amount, 0)
  return {
    bank: cappedBank,
    allocations,
    total,
    needed,
    covered: total >= needed,
    empty: needed <= 0,
  }
}

/* ------------------------------------------------------------- scheduling */

/**
 * Whether to offer a distribution. Offered once per ISO week, so taking it on
 * Monday does not leave the prompt nagging on Tuesday.
 */
export function shouldOfferDistribution(
  plan: Plan,
  lastDistributedWeek: string | null,
  today: ISODate = todayISO(),
): boolean {
  if (plan.empty || plan.total <= 0) return false
  return lastDistributedWeek !== isoWeekKey(today)
}

/** How many whole weeks of the current plan the Bank could cover. */
export function weeksOfRunway(plan: Plan): number {
  if (plan.needed <= 0) return 0
  return Math.floor(plan.bank / plan.needed)
}

/**
 * The date the Bank runs dry at this rate — useful for "top me up by" nudges.
 * Null when there is nothing being drawn down.
 */
export function bankRunsOut(plan: Plan, today: ISODate = todayISO()): ISODate | null {
  if (plan.needed <= 0 || plan.bank <= 0) return null
  return addDays(weekStart(today), weeksOfRunway(plan) * 7 + 7)
}

/** Distributions already made this week, for the ledger and the prompt. */
export function distributedThisWeek(entries: Entry[], today: ISODate = todayISO()): Cents {
  const week = isoWeekKey(today)
  let n = 0
  for (const e of entries) {
    if (e.transferId && e.kind === 'deposit' && isoWeekKey(e.date) === week) n += e.amount
  }
  return n
}

/** Guards the "days since" copy on the prompt without another date import. */
export function daysIntoWeek(today: ISODate = todayISO()): number {
  return daysBetween(weekStart(today), today)
}
