import { describe, expect, it } from 'vitest'
import {
  distributedThisWeek, planDistribution, shouldOfferDistribution, weeksOfRunway,
} from '../allocate'
import { derive } from '../selectors'
import { reducer } from '@/store/reducer'
import { entry, state, vault } from './factory'
import { isoWeekKey } from '../dates'

const TODAY = '2026-08-21' // a Friday
const d = (s: Parameters<typeof derive>[0]) => derive(s, TODAY)

// A vault 70 days out needs remaining/10 per week (7/70).
const v1 = vault({ id: 'v1', name: 'Camera', target: 70_000, deadline: '2026-10-30' })
const v2 = vault({ id: 'v2', name: 'Bike', target: 35_000, deadline: '2026-11-30' })

describe('planDistribution', () => {
  it('funds every vault fully when the Bank can cover it', () => {
    const r = d(state({ vaults: [v1, v2] }))
    const plan = planDistribution(r.vaults, 100_000)
    expect(plan.empty).toBe(false)
    expect(plan.covered).toBe(true)
    expect(plan.needed).toBe(plan.total)
    expect(plan.allocations.every((a) => !a.short)).toBe(true)
  })

  it('funds the nearest deadline first when the Bank falls short', () => {
    const r = d(state({ vaults: [v1, v2] }))
    const camera = r.vaultById.get('v1')!.pace.requiredPerWeek!
    const plan = planDistribution(r.vaults, camera) // exactly enough for the sooner vault, nothing left over
    const forCamera = plan.allocations.find((a) => a.vaultId === 'v1')!
    const forBike = plan.allocations.find((a) => a.vaultId === 'v2')
    expect(forCamera.amount).toBe(camera)
    expect(forCamera.short).toBe(false)
    expect(forBike).toBeUndefined() // nothing left for the later deadline
    expect(plan.covered).toBe(false)
  })

  it('never moves more than what remains on the vault, even with money to spare', () => {
    const nearlyDone = vault({ id: 'v3', target: 10_000, deadline: '2026-08-28' })
    const r = d(state({ vaults: [nearlyDone], entries: [entry(TODAY, 9_500, { vaultId: 'v3' })] }))
    const plan = planDistribution(r.vaults, 1_000_000)
    expect(plan.allocations[0].amount).toBe(500) // exactly what's left to reach the target
  })

  it('reports real need even when the Bank is empty, rather than hiding it', () => {
    const r = d(state({ vaults: [v1, v2] }))
    const plan = planDistribution(r.vaults, 0)
    expect(plan.empty).toBe(false) // there is real weekly need
    expect(plan.needed).toBeGreaterThan(0)
    expect(plan.allocations).toHaveLength(0)
    expect(plan.total).toBe(0)
    expect(plan.covered).toBe(false)
  })

  it('is empty only when nothing has both a target and a deadline to pace against', () => {
    const undated = vault({ id: 'v4', target: 50_000, deadline: null })
    const untargeted = vault({ id: 'v5', target: null, deadline: '2026-12-01' })
    const r = d(state({ vaults: [undated, untargeted] }))
    const plan = planDistribution(r.vaults, 50_000)
    expect(plan.empty).toBe(true)
    expect(plan.allocations).toHaveLength(0)
  })

  it('skips completed and archived vaults', () => {
    const done = vault({ id: 'v6', target: 10_000, deadline: '2026-12-01' })
    const archived = vault({ id: 'v7', target: 10_000, deadline: '2026-12-01', archived: true })
    const r = d(state({
      vaults: [done, archived],
      entries: [entry(TODAY, 10_000, { vaultId: 'v6' })],
    }))
    const plan = planDistribution(r.vaults, 50_000)
    expect(plan.empty).toBe(true)
  })
})

describe('shouldOfferDistribution', () => {
  it('offers when there is real money to move and it has not gone out this week', () => {
    const r = d(state({ vaults: [v1] }))
    const plan = planDistribution(r.vaults, 50_000)
    expect(shouldOfferDistribution(plan, null, TODAY)).toBe(true)
  })

  it('does not offer twice in the same ISO week', () => {
    const r = d(state({ vaults: [v1] }))
    const plan = planDistribution(r.vaults, 50_000)
    expect(shouldOfferDistribution(plan, isoWeekKey(TODAY), TODAY)).toBe(false)
  })

  it('does not offer an empty plan or a dry Bank', () => {
    const r = d(state({ vaults: [v1] }))
    expect(shouldOfferDistribution(planDistribution(r.vaults, 0), null, TODAY)).toBe(false)
    expect(shouldOfferDistribution(EMPTY, null, TODAY)).toBe(false)
  })
})
const EMPTY = planDistribution([], 50_000)

describe('weeksOfRunway', () => {
  it('counts whole weeks the Bank could sustain the current plan', () => {
    const r = d(state({ vaults: [v1] }))
    const need = r.vaultById.get('v1')!.pace.requiredPerWeek!
    const plan = planDistribution(r.vaults, need * 3)
    expect(weeksOfRunway(plan)).toBe(3)
  })

  it('is zero runway with nothing in the Bank', () => {
    const r = d(state({ vaults: [v1] }))
    expect(weeksOfRunway(planDistribution(r.vaults, 0))).toBe(0)
  })
})

describe('distributedThisWeek', () => {
  it('sums only transfer deposits landing in the given week', () => {
    const entries = [
      entry(TODAY, 5_000, { transferId: 't1' }),
      entry(TODAY, 3_000, { transferId: 't2' }),
      entry(TODAY, 1_000), // ordinary deposit, not a transfer
      entry('2026-07-01', 9_000, { transferId: 't3' }), // a different week
    ]
    expect(distributedThisWeek(entries, TODAY)).toBe(8_000)
  })
})

describe('a distribution is not new saving', () => {
  it('moves the Bank total into the vault without inflating deposits, XP or streaks', () => {
    const transferId = 'tx1'
    const r = d(state({
      vaults: [v1],
      entries: [
        entry(TODAY, 20_000), // a real deposit into the Bank
        entry(TODAY, 5_000, { vaultId: null, kind: 'withdrawal', transferId }),
        entry(TODAY, 5_000, { vaultId: 'v1', kind: 'deposit', transferId }),
      ],
    }))
    expect(r.totalSaved).toBe(20_000) // unchanged by shuffling money between pots
    expect(r.totalDeposited).toBe(20_000) // the transfer's deposit half doesn't count again
    expect(r.generalSaved).toBe(15_000) // 20,000 in, 5,000 moved out
    expect(r.vaultById.get('v1')!.saved).toBe(5_000)
    expect(r.depositDays).toEqual([TODAY]) // one day of real saving, not two entries
    expect(r.records.biggestSingle!.amount).toBe(20_000) // the transfer never becomes a "record"
  })
})

/**
 * A distribution is bookkeeping, not behaviour. These are the leaks that were
 * live in the first cut: quests counted a split as real deposits, badges
 * counted its Bank withdrawal as a real withdrawal, and the totals followed.
 */
describe('a distribution never counts as activity', () => {
  const transferId = 'tx'
  /** One real $200 deposit, then a split of $50 into a vault. */
  const withSplit = () => state({
    vaults: [v1],
    entries: [
      entry(TODAY, 20_000),
      entry(TODAY, 5_000, { vaultId: null, kind: 'withdrawal', transferId }),
      entry(TODAY, 5_000, { vaultId: 'v1', kind: 'deposit', transferId }),
    ],
  })
  /** The same account without the split, as the control. */
  const withoutSplit = () => state({ vaults: [v1], entries: [entry(TODAY, 20_000)] })

  it('does not register as a withdrawal', () => {
    expect(d(withSplit()).totalWithdrawn).toBe(0)
  })

  it('cannot complete a quest that a real deposit would', () => {
    const split = d(withSplit()).quests
    const control = d(withoutSplit()).quests
    for (const q of split) {
      const same = control.find((c) => c.id === q.id)
      if (same) expect(q.progress).toBe(same.progress)
    }
  })

  it('cannot break a badge by looking like money leaving', () => {
    const unlocked = (s: ReturnType<typeof state>) =>
      d(s).achievements.filter((a) => a.unlocked).map((a) => a.id).sort()
    expect(unlocked(withSplit())).toEqual(unlocked(withoutSplit()))
  })

  // "Untouched" needs a fully elapsed month with deposits and no withdrawals.
  // A split inside that month books a Bank withdrawal, which used to void it.
  it('does not void the untouched-month badge it never actually touched', () => {
    const JUNE = '2026-06-10'
    const clean = state({
      vaults: [v1],
      entries: [
        entry(JUNE, 20_000),
        entry(JUNE, 5_000, { vaultId: null, kind: 'withdrawal', transferId: 'j1' }),
        entry(JUNE, 5_000, { vaultId: 'v1', kind: 'deposit', transferId: 'j1' }),
      ],
    })
    const badge = d(clean).achievements.find((a) => a.id === 'clean_month')!
    expect(badge.unlocked).toBe(true)
  })

  it('leaves level and XP exactly where the real deposit put them', () => {
    expect(d(withSplit()).xp.total).toBe(d(withoutSplit()).xp.total)
    expect(d(withSplit()).level.level).toBe(d(withoutSplit()).level.level)
  })

  it('still moves the money, which is the entire point', () => {
    const r = d(withSplit())
    expect(r.generalSaved).toBe(15_000)
    expect(r.vaultById.get('v1')!.saved).toBe(5_000)
    expect(r.totalSaved).toBe(20_000)
  })
})

describe('a vault past its deadline', () => {
  it('is flagged as catching up, so a large row is explained not mysterious', () => {
    const overdue = vault({ id: 'od', name: 'Overdue', target: 50_000, deadline: '2026-08-01' })
    const r = d(state({ vaults: [overdue, v1] }))
    const plan = planDistribution(r.vaults, 100_000)
    const od = plan.allocations.find((a) => a.vaultId === 'od')!
    expect(od.catchUp).toBe(true)
    expect(od.amount).toBe(50_000) // everything it still needs, because it is late
    expect(plan.allocations.find((a) => a.vaultId === 'v1')!.catchUp).toBe(false)
  })
})

/**
 * A transfer is two entries that must live and die together. Deleting one half
 * used to leave the vault holding money that had never left the Bank, and the
 * running total climbed on its own — a savings app inventing money.
 */
describe('deleting half a transfer', () => {
  const tx = 'tx1'
  const withSplit = () => state({
    vaults: [v1],
    entries: [
      entry(TODAY, 20_000),
      entry(TODAY, 5_000, { id: 'out', vaultId: null, kind: 'withdrawal', transferId: tx }),
      entry(TODAY, 5_000, { id: 'in', vaultId: 'v1', kind: 'deposit', transferId: tx }),
    ],
  })

  it('takes the other half with it, from either end', () => {
    for (const id of ['out', 'in']) {
      const after = d(reducer(withSplit(), { type: 'entry/delete', id }))
      expect(after.totalSaved).toBe(20_000)     // no money invented, none destroyed
      expect(after.generalSaved).toBe(20_000)   // the split is fully undone
      expect(after.vaultById.get('v1')!.saved).toBe(0)
      expect(after.entries).toHaveLength(1)
    }
  })

  it('still deletes an ordinary entry on its own', () => {
    const s = state({ entries: [entry(TODAY, 20_000, { id: 'a' }), entry(TODAY, 3_000, { id: 'b' })] })
    const after = d(reducer(s, { type: 'entry/delete', id: 'b' }))
    expect(after.totalSaved).toBe(20_000)
    expect(after.entries).toHaveLength(1)
  })
})
