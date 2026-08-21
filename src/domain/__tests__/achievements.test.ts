import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID, achievementXp, evaluateAchievements } from '../achievements'
import { derive } from '../selectors'
import { entry, state, vault, weeklyDeposits } from './factory'

const TODAY = '2026-08-21'
const unlockedIds = (s: Parameters<typeof derive>[0]) =>
  derive(s, TODAY).achievements.filter((a) => a.unlocked).map((a) => a.id)

describe('the catalogue', () => {
  it('has unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('gives every badge a name, description, icon and tier', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0)
      expect(a.description.length).toBeGreaterThan(0)
      expect(a.icon.length).toBeGreaterThan(0)
      expect([1, 2, 3]).toContain(a.tier)
      expect(a.xp).toBeGreaterThanOrEqual(0)
    }
  })

  it('indexes by id', () => {
    expect(ACHIEVEMENTS_BY_ID.first_deposit.name).toBe('First Coin')
  })

  it('unlocks nothing on an empty account', () => {
    expect(unlockedIds(state())).toEqual([])
  })

  it('never throws on an empty account, whatever the predicate does', () => {
    const empty = derive(state(), TODAY)
    expect(() => evaluateAchievements({
      today: TODAY, entries: [], deposits: [], withdrawals: [], vaults: [],
      completedVaults: [], totalDeposited: 0, totalSaved: 0, streak: empty.streak,
      records: empty.records, monthlyNet: new Map(), monthlyTarget: 0, level: 1,
      claimedQuestCount: 0, activeVaultCount: 0,
    }, {})).not.toThrow()
  })
})

describe('volume badges', () => {
  it('unlock in order as the total grows', () => {
    expect(unlockedIds(state({ entries: [entry(TODAY, 10_000)] }))).toContain('vol_100')
    expect(unlockedIds(state({ entries: [entry(TODAY, 10_000)] }))).not.toContain('vol_500')
    expect(unlockedIds(state({ entries: [entry(TODAY, 100_000)] }))).toContain('vol_1k')
  })

  it('counts deposits, not the current balance', () => {
    // Saved then spent — the effort still happened.
    const s = state({ entries: [entry('2026-08-01', 100_000), entry(TODAY, 99_000, { kind: 'withdrawal' })] })
    expect(unlockedIds(s)).toContain('vol_1k')
  })
})

describe('vault badges', () => {
  it('unlocks on the first completed vault', () => {
    const s = state({
      vaults: [vault({ id: 'v', target: 10_000 })],
      entries: [entry(TODAY, 10_000, { vaultId: 'v' })],
    })
    expect(unlockedIds(s)).toContain('first_complete')
  })

  it('recognises beating a deadline', () => {
    const s = state({
      vaults: [vault({ id: 'v', target: 10_000, deadline: '2026-09-01' })],
      entries: [entry('2026-08-10', 10_000, { vaultId: 'v' })],
    })
    expect(unlockedIds(s)).toContain('ontime')
  })

  it('does not award the on-time badge for a vault finished late', () => {
    const s = state({
      vaults: [vault({ id: 'v', target: 10_000, deadline: '2026-08-01' })],
      entries: [entry('2026-08-10', 10_000, { vaultId: 'v' })],
    })
    expect(unlockedIds(s)).not.toContain('ontime')
  })

  it('has a dedicated badge for delivering Christmas', () => {
    const s = state({
      vaults: [vault({ id: 'x', target: 50_000, deadline: '2026-12-20' })],
      entries: [entry('2026-08-10', 50_000, { vaultId: 'x' })],
    })
    expect(unlockedIds(s)).toContain('christmas')
  })
})

describe('behavioural badges', () => {
  it('spots a comeback after three weeks away', () => {
    const s = state({ entries: [entry('2026-07-01', 5_000), entry(TODAY, 5_000)] })
    expect(unlockedIds(s)).toContain('comeback')
  })

  it('does not cry comeback over a short gap', () => {
    const s = state({ entries: [entry('2026-08-15', 5_000), entry(TODAY, 5_000)] })
    expect(unlockedIds(s)).not.toContain('comeback')
  })

  it('spots a full untouched month once it has ended', () => {
    const s = state({ entries: weeklyDeposits('2026-07-27', 4, 5_000) })
    expect(unlockedIds(s)).toContain('clean_month')
  })

  it('does not award an untouched month when money came back out', () => {
    const s = state({
      entries: [...weeklyDeposits('2026-07-27', 4, 5_000), entry('2026-07-20', 1_000, { kind: 'withdrawal' })],
    })
    expect(unlockedIds(s)).not.toContain('clean_month')
  })

  it('spots a perfect seven-day week', () => {
    const week = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16']
    expect(unlockedIds(state({ entries: week.map((day) => entry(day, 1_000)) }))).toContain('perfect_week')
  })

  it('needs all seven days, not six', () => {
    const week = ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15']
    expect(unlockedIds(state({ entries: week.map((day) => entry(day, 1_000)) }))).not.toContain('perfect_week')
  })

  it('spots a freeze rescuing a week', () => {
    const s = state({ entries: [...weeklyDeposits('2026-08-03', 4, 5_000), entry(TODAY, 5_000)] })
    expect(unlockedIds(s)).toContain('freeze_saved')
  })

  it('rewards hitting the monthly target for a completed month', () => {
    const s = state({ entries: [entry('2026-07-15', 50_000)] })
    expect(unlockedIds(s)).toContain('target_hit')
  })

  it('spots an overachieving month', () => {
    const s = state({ entries: [entry('2026-07-15', 60_000)] }) // target is 400
    expect(unlockedIds(s)).toContain('overachiever')
  })
})

describe('hidden badges', () => {
  it('marks the surprises as hidden', () => {
    const hidden = ACHIEVEMENTS.filter((a) => a.hidden).map((a) => a.id)
    expect(hidden).toContain('comeback')
    expect(hidden).toContain('night_owl')
  })

  it('unlocks the night owl for a late-night deposit', () => {
    const late = entry(TODAY, 5_000)
    late.createdAt = new Date(`${TODAY}T02:30:00`).getTime()
    expect(unlockedIds(state({ entries: [late] }))).toContain('night_owl')
  })

  it('leaves the night owl locked for a daytime one', () => {
    expect(unlockedIds(state({ entries: [entry(TODAY, 5_000)] }))).not.toContain('night_owl')
  })
})

describe('XP', () => {
  it('sums only unlocked badges', () => {
    const r = derive(state({ entries: [entry(TODAY, 10_000)] }), TODAY)
    const expected = r.achievements.filter((a) => a.unlocked).reduce((n, a) => n + a.xp, 0)
    expect(achievementXp(r.achievements)).toBe(expected)
    expect(r.xp.achievements).toBe(expected)
  })
})
