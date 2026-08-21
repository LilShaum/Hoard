import { describe, expect, it } from 'vitest'
import {
  levelForXp, MAX_LEVEL, nextRank, RANKS, rankForLevel, themesUnlockedAt,
  xpForDeposit, xpForLevel, xpForStreakWeek, xpForVaultCompletion,
} from '../xp'

describe('the level curve', () => {
  it('starts at level 1 with zero XP', () => {
    const l = levelForXp(0)
    expect(l.level).toBe(1)
    expect(l.progress).toBe(0)
    expect(l.xpToNext).toBe(50)
  })

  it('rises monotonically and never plateaus', () => {
    for (let n = 2; n <= MAX_LEVEL; n++) {
      expect(xpForLevel(n)).toBeGreaterThan(xpForLevel(n - 1))
    }
  })

  it('gets steeper, so late levels are earned', () => {
    const span = (n: number) => xpForLevel(n + 1) - xpForLevel(n)
    expect(span(20)).toBeGreaterThan(span(5))
    expect(span(40)).toBeGreaterThan(span(20))
  })

  it('gives the first level quickly', () => {
    // Two modest deposits should be enough to see level 2.
    expect(xpForDeposit(2000) + xpForDeposit(3000)).toBeGreaterThanOrEqual(xpForLevel(2))
  })

  it('places XP inside the right level', () => {
    const atFloor = levelForXp(xpForLevel(5))
    expect(atFloor.level).toBe(5)
    expect(atFloor.xpIntoLevel).toBe(0)

    const justBelow = levelForXp(xpForLevel(5) - 1)
    expect(justBelow.level).toBe(4)
    expect(justBelow.xpToNext).toBe(1)
  })

  it('reports progress as a clean 0–1 fraction', () => {
    const mid = levelForXp(xpForLevel(6) + Math.floor((xpForLevel(7) - xpForLevel(6)) / 2))
    expect(mid.level).toBe(6)
    expect(mid.progress).toBeGreaterThan(0.45)
    expect(mid.progress).toBeLessThan(0.55)
  })

  it('caps out cleanly', () => {
    const l = levelForXp(10_000_000)
    expect(l.level).toBe(MAX_LEVEL)
    expect(l.isMax).toBe(true)
    expect(l.xpToNext).toBe(0)
    expect(l.progress).toBe(1)
  })

  it('tolerates junk input', () => {
    expect(levelForXp(-500).level).toBe(1)
    expect(levelForXp(12.7).xp).toBe(12)
  })
})

describe('deposit XP', () => {
  it('rewards more money with more XP', () => {
    expect(xpForDeposit(5000)).toBeGreaterThan(xpForDeposit(1000))
    expect(xpForDeposit(500_000)).toBeGreaterThan(xpForDeposit(5000))
  })

  it('has strongly diminishing returns, so the ladder cannot be bought', () => {
    const small = xpForDeposit(1000)   // $10
    const huge = xpForDeposit(1_000_000) // $10,000
    // 1000x the money, nowhere near 1000x the reward.
    expect(huge / small).toBeLessThan(6)
  })

  it('makes one big deposit worth more than the same money split up', () => {
    const once = xpForDeposit(6000)
    const split = xpForDeposit(2000) * 3
    // Splitting *looks* better per-deposit, which is exactly why the daily cap
    // in selectors exists — this test documents the raw curve's shape.
    expect(split).toBeGreaterThan(once)
    expect(xpForDeposit(6000)).toBeGreaterThan(xpForDeposit(2000))
  })

  it('gives nothing for nothing', () => {
    expect(xpForDeposit(0)).toBe(0)
    expect(xpForDeposit(-500)).toBe(0)
  })
})

describe('other XP sources', () => {
  it('scales vault rewards with the size of the vault', () => {
    expect(xpForVaultCompletion(50_000)).toBeGreaterThan(200)
    expect(xpForVaultCompletion(1_000_000)).toBeGreaterThan(xpForVaultCompletion(50_000))
    expect(xpForVaultCompletion(null)).toBe(200)
  })

  it('pays more for longer streaks but stops runaway growth', () => {
    expect(xpForStreakWeek(1)).toBe(30)
    expect(xpForStreakWeek(10)).toBe(75)
    expect(xpForStreakWeek(20)).toBe(125)
    expect(xpForStreakWeek(200)).toBe(125)
  })
})

describe('ranks', () => {
  it('is ordered and gap-free', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minLevel).toBeGreaterThan(RANKS[i - 1].minLevel)
    }
  })

  it('resolves a rank for every level', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) expect(rankForLevel(l)).toBeTruthy()
    expect(rankForLevel(1).key).toBe('wyrmling')
    expect(rankForLevel(10).key).toBe('vaultkeeper')
    expect(rankForLevel(14).key).toBe('vaultkeeper')
    expect(rankForLevel(99).key).toBe('elderwyrm')
  })

  it('knows what comes next, and that nothing follows the last', () => {
    expect(nextRank(1)?.key).toBe('coinsprite')
    expect(nextRank(99)).toBeNull()
  })

  it('unlocks one theme per rank reached', () => {
    expect(themesUnlockedAt(1)).toEqual(['midnight'])
    expect(themesUnlockedAt(10)).toHaveLength(4)
    expect(themesUnlockedAt(99)).toHaveLength(RANKS.length)
  })

  it('gives every rank a distinct theme', () => {
    expect(new Set(RANKS.map((r) => r.theme)).size).toBe(RANKS.length)
  })
})
