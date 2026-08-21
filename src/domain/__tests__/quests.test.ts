import { describe, expect, it } from 'vitest'
import { claimedQuestXp, generateQuests, niceMoney, questDetail, QUEST_COUNT, type QuestContext } from '../quests'
import { seeded, shuffle, hashString } from '../rng'
import { entry, vault, weeklyDeposits } from './factory'
import { XP_QUEST } from '../xp'

const TODAY = '2026-08-21'

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  today: TODAY,
  entries: [],
  vaults: [],
  monthlyTarget: 40_000,
  weeklyLimit: 0,
  claimed: {},
  ...over,
})

describe('the PRNG', () => {
  it('is deterministic for a given seed', () => {
    const a = seeded('x'); const b = seeded('x')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces different streams for different seeds', () => {
    expect(seeded('a')()).not.toBe(seeded('b')())
  })

  it('stays inside [0, 1)', () => {
    const r = seeded('range')
    for (let i = 0; i < 2000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('hashes distinct strings to distinct values', () => {
    const keys = ['2026-W01', '2026-W02', '2026-W03', 'a', 'b']
    expect(new Set(keys.map(hashString)).size).toBe(keys.length)
  })

  it('shuffles without mutating or losing items', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src, seeded('s'))
    expect(src).toEqual([1, 2, 3, 4, 5])
    expect(out.slice().sort()).toEqual(src)
  })
})

describe('generation', () => {
  it('produces the expected number of quests per tier', () => {
    const qs = generateQuests(ctx())
    expect(qs.filter((q) => q.tier === 'daily')).toHaveLength(QUEST_COUNT.daily)
    expect(qs.filter((q) => q.tier === 'weekly')).toHaveLength(QUEST_COUNT.weekly)
    expect(qs.filter((q) => q.tier === 'monthly')).toHaveLength(QUEST_COUNT.monthly)
  })

  it('is identical across calls — refreshing cannot reroll a quest', () => {
    const a = generateQuests(ctx()).map((q) => q.id)
    const b = generateQuests(ctx()).map((q) => q.id)
    expect(a).toEqual(b)
  })

  it('gives different days different daily quests over a week', () => {
    const ids = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21']
      .map((d) => generateQuests(ctx({ today: d })).find((q) => q.tier === 'daily')!.kind)
    expect(new Set(ids).size).toBeGreaterThan(1)
  })

  it('never issues the same quest twice in one tier', () => {
    const weekly = generateQuests(ctx()).filter((q) => q.tier === 'weekly')
    expect(new Set(weekly.map((q) => q.kind)).size).toBe(weekly.length)
  })

  it('always keeps the monthly target on the board', () => {
    const monthly = generateQuests(ctx()).filter((q) => q.tier === 'monthly')
    expect(monthly.some((q) => q.kind === 'target')).toBe(true)
  })

  it('stamps each quest with the period it belongs to', () => {
    const qs = generateQuests(ctx())
    expect(qs.find((q) => q.tier === 'daily')!.periodKey).toBe(TODAY)
    expect(qs.find((q) => q.tier === 'weekly')!.periodKey).toBe('2026-W34')
    expect(qs.find((q) => q.tier === 'monthly')!.periodKey).toBe('2026-08')
    expect(qs.find((q) => q.tier === 'weekly')!.expiresAt).toBe('2026-08-23')
  })
})

describe('dynamic targets', () => {
  it('scales money targets to the size of the saver', () => {
    const small = generateQuests(ctx({ entries: weeklyDeposits(TODAY, 8, 2_000) }))
    const large = generateQuests(ctx({ entries: weeklyDeposits(TODAY, 8, 200_000) }))
    const weeklyAmount = (qs: typeof small) =>
      qs.find((q) => q.tier === 'weekly' && q.unit === 'money')?.target ?? 0
    expect(weeklyAmount(large)).toBeGreaterThan(weeklyAmount(small))
  })

  it('falls back to a gentle default for a brand-new user', () => {
    const qs = generateQuests(ctx({ monthlyTarget: 0 }))
    for (const q of qs.filter((x) => x.unit === 'money')) {
      expect(q.target).toBeGreaterThan(0)
      expect(Number.isFinite(q.target)).toBe(true)
    }
  })

  it('rounds targets to numbers a person would have picked', () => {
    expect(niceMoney(1_234)).toBe(1_000)    // $12.34 -> $10
    expect(niceMoney(4_780)).toBe(5_000)    // $47.80 -> $50
    expect(niceMoney(37_900)).toBe(40_000)  // $379   -> $400
    expect(niceMoney(1)).toBe(500)          // never below the smallest step
    // The step widens with magnitude, so targets stay readable at every scale.
    expect(niceMoney(1_000_000) % 50_000).toBe(0)
  })
})

describe('progress', () => {
  it('tracks a money quest against this period only', () => {
    const entries = [entry(TODAY, 30_000), entry('2026-07-01', 500_000)]
    const q = generateQuests(ctx({ entries })).find((x) => x.kind === 'target')!
    expect(q.progress).toBe(30_000)
  })

  it('counts distinct days for the three-touches quest', () => {
    const entries = [entry('2026-08-17', 100), entry('2026-08-17', 100), entry('2026-08-19', 100)]
    const qs = generateQuests(ctx({ entries, claimed: {} }))
    const days = qs.find((q) => q.kind === 'days' && q.tier === 'weekly')
    if (days) expect(days.progress).toBe(2)
  })

  it('marks a quest done and claimable once the target is met', () => {
    const entries = [entry(TODAY, 60_000)]
    const q = generateQuests(ctx({ entries })).find((x) => x.kind === 'target')!
    expect(q.done).toBe(true)
    expect(q.claimable).toBe(true)
    expect(q.fraction).toBe(1)
  })

  it('stops being claimable once claimed', () => {
    const entries = [entry(TODAY, 60_000)]
    const first = generateQuests(ctx({ entries })).find((x) => x.kind === 'target')!
    const after = generateQuests(ctx({ entries, claimed: { [first.id]: TODAY } }))
      .find((x) => x.kind === 'target')!
    expect(after.claimed).toBe(true)
    expect(after.claimable).toBe(false)
  })

  it('never reports progress above the target', () => {
    const entries = [entry(TODAY, 5_000_000)]
    for (const q of generateQuests(ctx({ entries }))) {
      expect(q.progress).toBeLessThanOrEqual(q.target)
      expect(q.fraction).toBeLessThanOrEqual(1)
    }
  })

  it('tracks the dated-vault quest against dated vaults only', () => {
    const dated = vault({ id: 'vd', deadline: '2026-12-25' })
    const undated = vault({ id: 'vu', deadline: null })
    const qs = generateQuests(ctx({
      today: '2026-08-19',
      vaults: [dated, undated],
      entries: [entry('2026-08-19', 1_000, { vaultId: 'vu' })],
    }))
    const q = qs.find((x) => x.kind === 'dated')
    if (q) expect(q.progress).toBe(0)
  })
})

describe('rendering and rewards', () => {
  it('substitutes the money placeholder in the user currency', () => {
    const q = generateQuests(ctx()).find((x) => x.kind === 'target')!
    expect(questDetail(q, (c) => `$${c / 100}`)).toContain('$400')
    expect(questDetail(q, (c) => `$${c / 100}`)).not.toContain('{money}')
  })

  it('banks XP by tier from claimed quest ids', () => {
    expect(claimedQuestXp({
      '2026-08-21:daily:any': TODAY,
      '2026-W34:weekly:days': TODAY,
      '2026-08:monthly:target': TODAY,
    })).toBe(XP_QUEST.daily + XP_QUEST.weekly + XP_QUEST.monthly)
  })

  it('ignores unparseable ids rather than throwing', () => {
    expect(claimedQuestXp({ garbage: TODAY })).toBe(0)
  })
})
