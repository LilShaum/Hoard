import { describe, expect, it } from 'vitest'
import { derive } from '../selectors'
import { entry, state, vault, weeklyDeposits } from './factory'
import { xpForDeposit, xpForLevel, XP_MONTHLY_TARGET } from '../xp'

const TODAY = '2026-08-21'
const d = (s: Parameters<typeof derive>[0]) => derive(s, TODAY)

describe('a blank slate', () => {
  const r = d(state())

  it('shows nothing rather than NaN', () => {
    expect(r.totalSaved).toBe(0)
    expect(r.level.level).toBe(1)
    expect(r.xp.total).toBe(0)
    expect(r.hasData).toBe(false)
    expect(r.month.fraction).toBe(0)
  })

  it('still offers quests and achievements to work towards', () => {
    expect(r.quests.length).toBeGreaterThan(0)
    expect(r.achievements.length).toBeGreaterThan(0)
    expect(r.achievements.every((a) => !a.unlocked)).toBe(true)
  })
})

describe('balances', () => {
  it('nets deposits against withdrawals', () => {
    const r = d(state({ entries: [entry(TODAY, 10_000), entry(TODAY, 3_000, { kind: 'withdrawal' })] }))
    expect(r.totalSaved).toBe(7_000)
    expect(r.totalDeposited).toBe(10_000)
    expect(r.totalWithdrawn).toBe(3_000)
  })

  it('splits money between vaults and the general hoard', () => {
    const v = vault({ id: 'v1' })
    const r = d(state({
      vaults: [v],
      entries: [entry(TODAY, 10_000, { vaultId: 'v1' }), entry(TODAY, 4_000)],
    }))
    expect(r.vaultById.get('v1')!.saved).toBe(10_000)
    expect(r.generalSaved).toBe(4_000)
    expect(r.totalSaved).toBe(14_000)
  })

  it('ignores entries pointing at a vault that no longer exists', () => {
    const r = d(state({ entries: [entry(TODAY, 5_000, { vaultId: 'ghost' })] }))
    expect(r.totalSaved).toBe(5_000)
    expect(r.vaults).toHaveLength(0)
  })
})

describe('vault completion', () => {
  it('derives the day the target was first reached', () => {
    const v = vault({ id: 'v1', target: 10_000 })
    const r = d(state({
      vaults: [v],
      entries: [
        entry('2026-08-01', 4_000, { vaultId: 'v1' }),
        entry('2026-08-10', 6_000, { vaultId: 'v1' }),
        entry('2026-08-15', 2_000, { vaultId: 'v1' }),
      ],
    }))
    expect(r.vaultById.get('v1')!.reachedAt).toBe('2026-08-10')
    expect(r.vaultById.get('v1')!.isComplete).toBe(true)
  })

  it('keeps the reached date after a later withdrawal, but drops the complete flag', () => {
    const v = vault({ id: 'v1', target: 10_000 })
    const r = d(state({
      vaults: [v],
      entries: [
        entry('2026-08-10', 10_000, { vaultId: 'v1' }),
        entry('2026-08-15', 5_000, { vaultId: 'v1', kind: 'withdrawal' }),
      ],
    }))
    const view = r.vaultById.get('v1')!
    expect(view.reachedAt).toBe('2026-08-10')
    expect(view.isComplete).toBe(false)
  })

  it('sorts vaults into active, complete and archived', () => {
    const r = d(state({
      vaults: [
        vault({ id: 'a', target: 10_000 }),
        vault({ id: 'b', target: 10_000 }),
        vault({ id: 'c', target: 10_000, archived: true }),
      ],
      entries: [entry(TODAY, 10_000, { vaultId: 'b' })],
    }))
    expect(r.activeVaults.map((v) => v.id)).toEqual(['a'])
    expect(r.completedVaults.map((v) => v.id)).toEqual(['b'])
    expect(r.archivedVaults.map((v) => v.id)).toEqual(['c'])
  })
})

describe('derived XP', () => {
  it('pays for deposits', () => {
    const r = d(state({ entries: [entry(TODAY, 5_000)] }))
    expect(r.xp.deposits).toBe(xpForDeposit(5_000))
  })

  it('caps XP-earning deposits per day, so splitting cannot farm it', () => {
    const five = Array.from({ length: 5 }, () => entry(TODAY, 2_000))
    const r = d(state({ entries: five }))
    expect(r.xp.deposits).toBe(xpForDeposit(2_000) * 3)
  })

  it('applies the cap per day, not per week', () => {
    const spread = ['2026-08-17', '2026-08-18', '2026-08-19'].map((day) => entry(day, 2_000))
    const r = d(state({ entries: spread }))
    expect(r.xp.deposits).toBe(xpForDeposit(2_000) * 3)
  })

  it('counts the largest deposits of a day when capping', () => {
    const mixed = [entry(TODAY, 100), entry(TODAY, 100), entry(TODAY, 100), entry(TODAY, 500_000)]
    const r = d(state({ entries: mixed }))
    expect(r.xp.deposits).toBe(xpForDeposit(500_000) + xpForDeposit(100) * 2)
  })

  it('pays for hitting the monthly target', () => {
    const r = d(state({ entries: [entry(TODAY, 40_000)] }))
    expect(r.xp.monthly).toBe(XP_MONTHLY_TARGET)
    expect(r.month.hit).toBe(true)
  })

  it('does not pay for a month that has not been hit', () => {
    const r = d(state({ entries: [entry(TODAY, 39_999)] }))
    expect(r.xp.monthly).toBe(0)
  })

  it('adds up every source into the level', () => {
    const r = d(state({ entries: weeklyDeposits(TODAY, 6, 20_000) }))
    const sum = r.xp.deposits + r.xp.vaults + r.xp.streak + r.xp.monthly + r.xp.quests + r.xp.achievements
    expect(r.xp.total).toBe(sum)
    expect(r.level.level).toBe(levelFromXp(r.xp.total))
  })

  it('is a pure function of state — the same input always gives the same level', () => {
    const s = state({ entries: weeklyDeposits(TODAY, 10, 15_000) })
    expect(derive(s, TODAY).xp.total).toBe(derive(s, TODAY).xp.total)
  })

  it('gives no XP to the level-gated badges, so XP cannot feed itself', () => {
    const s = state({ entries: weeklyDeposits(TODAY, 40, 100_000) })
    const r = derive(s, TODAY)
    const rankBadges = r.achievements.filter((a) => a.id.startsWith('rank_'))
    expect(rankBadges.length).toBeGreaterThan(0)
    expect(rankBadges.every((a) => a.xp === 0)).toBe(true)
  })
})

function levelFromXp(xp: number): number {
  let l = 1
  while (l < 60 && xp >= xpForLevel(l + 1)) l++
  return l
}

describe('this month', () => {
  it('measures against the target and knows how much is left', () => {
    const r = d(state({ entries: [entry('2026-08-05', 10_000)] }))
    expect(r.month.key).toBe('2026-08')
    expect(r.month.saved).toBe(10_000)
    expect(r.month.remaining).toBe(30_000)
    expect(r.month.fraction).toBeCloseTo(0.25)
    expect(r.month.daysLeft).toBe(10)
  })

  it('ignores other months', () => {
    const r = d(state({ entries: [entry('2026-07-30', 100_000)] }))
    expect(r.month.saved).toBe(0)
  })

  it('knows whether the month is on pace, not just how full it is', () => {
    // 21 of 31 days gone (~68%), so 25% of target is behind pace.
    expect(d(state({ entries: [entry('2026-08-05', 10_000)] })).month.onPace).toBe(false)
    expect(d(state({ entries: [entry('2026-08-05', 35_000)] })).month.onPace).toBe(true)
  })

  it('is always on pace when no target is set', () => {
    const s = state()
    s.profile.monthlyTarget = 0
    expect(d(s).month.onPace).toBe(true)
  })
})

describe('achievements', () => {
  it('unlocks the first-deposit badge', () => {
    const r = d(state({ entries: [entry(TODAY, 1_000)] }))
    expect(r.achievements.find((a) => a.id === 'first_deposit')!.unlocked).toBe(true)
  })

  it('reports partial progress on locked tiered badges', () => {
    const r = d(state({ entries: [entry(TODAY, 25_000)] }))
    const v = r.achievements.find((a) => a.id === 'vol_500')!
    expect(v.unlocked).toBe(false)
    expect(v.fraction).toBeCloseTo(0.5)
  })

  it('lists newly satisfied badges that have not been recorded yet', () => {
    const r = d(state({ entries: [entry(TODAY, 1_000)] }))
    expect(r.pendingAchievements).toContain('first_deposit')
  })

  it('stops listing a badge once it has been recorded', () => {
    const s = state({ entries: [entry(TODAY, 1_000)] })
    s.progress.unlockedAchievements = { first_deposit: TODAY }
    expect(derive(s, TODAY).pendingAchievements).not.toContain('first_deposit')
  })
})

describe('ordering', () => {
  it('puts recent activity newest-first', () => {
    const r = d(state({ entries: [entry('2026-08-01', 100), entry('2026-08-20', 200)] }))
    expect(r.recent[0].date).toBe('2026-08-20')
  })

  it('holds entries in the order money actually moved', () => {
    const r = d(state({ entries: [entry('2026-08-20', 200), entry('2026-08-01', 100)] }))
    expect(r.entries.map((e) => e.date)).toEqual(['2026-08-01', '2026-08-20'])
  })
})
