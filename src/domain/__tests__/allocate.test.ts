import { describe, expect, it } from 'vitest'
import {
  bankRunsOut, daysIntoWeek, distributedThisWeek, planDistribution, shouldOfferDistribution,
  weeksOfRunway,
} from '../allocate'
import { derive } from '../selectors'
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

describe('weeksOfRunway and bankRunsOut', () => {
  it('counts whole weeks the Bank could sustain the current plan', () => {
    const r = d(state({ vaults: [v1] }))
    const need = r.vaultById.get('v1')!.pace.requiredPerWeek!
    const plan = planDistribution(r.vaults, need * 3)
    expect(weeksOfRunway(plan)).toBe(3)
    expect(bankRunsOut(plan, TODAY)).not.toBeNull()
  })

  it('is zero runway with nothing in the Bank', () => {
    const r = d(state({ vaults: [v1] }))
    const plan = planDistribution(r.vaults, 0)
    expect(weeksOfRunway(plan)).toBe(0)
    expect(bankRunsOut(plan, TODAY)).toBeNull()
  })
})

describe('distributedThisWeek and daysIntoWeek', () => {
  it('sums only transfer deposits landing in the given week', () => {
    const entries = [
      entry(TODAY, 5_000, { transferId: 't1' }),
      entry(TODAY, 3_000, { transferId: 't2' }),
      entry(TODAY, 1_000), // ordinary deposit, not a transfer
      entry('2026-07-01', 9_000, { transferId: 't3' }), // a different week
    ]
    expect(distributedThisWeek(entries, TODAY)).toBe(8_000)
  })

  it('counts days since Monday', () => {
    expect(daysIntoWeek(TODAY)).toBe(daysIntoWeekReference(TODAY))
  })
})

function daysIntoWeekReference(iso: string): number {
  const dow = new Date(`${iso}T00:00:00`).getDay() // 0 = Sunday
  return dow === 0 ? 6 : dow - 1
}

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
