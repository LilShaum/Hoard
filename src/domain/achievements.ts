import type { Cents, Entry, ISODate, Vault } from './types'
import { addMonths, daysBetween, isoWeekKey, monthEnd, monthKey } from './dates'
import type { StreakInfo } from './streak'
import type { Records } from './stats'
import { clamp01 } from './money'

/**
 * Badges. Each one is a pure predicate over a pre-computed facts object, plus an
 * optional progress function so the UI can show "7 / 12 weeks" on a locked badge
 * rather than a dead grey square.
 *
 * Note on the rank badges: they award **0 XP** on purpose. Awarding XP for
 * reaching a level, when the level is itself derived from XP, is a feedback
 * loop — one that can cascade a single deposit into three level-ups. They are
 * prestige only.
 */

export type AchFamily = 'first' | 'volume' | 'consistency' | 'discipline' | 'story'

/**
 * Vault completion is *derived* (the day the balance first crossed the target),
 * not a stored flag — so badges read `reachedAt`, never `completedAt`.
 */
export type CompletedVault = {
  target: Cents | null
  deadline: ISODate | null
  reachedAt: ISODate | null
}

export type AchFacts = {
  today: ISODate
  entries: Entry[]
  deposits: Entry[]
  withdrawals: Entry[]
  vaults: Vault[]
  completedVaults: CompletedVault[]
  totalDeposited: Cents
  totalSaved: Cents
  streak: StreakInfo
  records: Records
  monthlyNet: Map<string, Cents>
  monthlyTarget: Cents
  level: number
  claimedQuestCount: number
  activeVaultCount: number
}

export type Achievement = {
  id: string
  name: string
  description: string
  icon: string
  family: AchFamily
  xp: number
  /** 1 = bronze, 2 = silver, 3 = gold. Drives the ring colour. */
  tier: 1 | 2 | 3
  /** Hidden badges show as '???' until unlocked. */
  hidden?: boolean
  test: (f: AchFacts) => boolean
  progress?: (f: AchFacts) => number
}

const money = (n: number) => n * 100

/** Months that have fully elapsed, oldest first. */
function completedMonths(f: AchFacts): string[] {
  return [...f.monthlyNet.keys()]
    .filter((k) => monthEnd(`${k}-01`) < f.today)
    .sort()
}

function hasCleanMonth(f: AchFacts): boolean {
  const byMonthWithdrawals = new Set(f.withdrawals.map((e) => monthKey(e.date)))
  const byMonthDeposits = new Set(f.deposits.map((e) => monthKey(e.date)))
  return completedMonths(f).some((k) => byMonthDeposits.has(k) && !byMonthWithdrawals.has(k))
}

function consecutiveTargetMonths(f: AchFacts): number {
  if (f.monthlyTarget <= 0) return 0
  const months = completedMonths(f)
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of months) {
    const contiguous = prev != null && monthKey(addMonths(`${prev}-01`, 1)) === k
    run = contiguous ? run : 0
    if ((f.monthlyNet.get(k) ?? 0) >= f.monthlyTarget) run += 1
    else run = 0
    best = Math.max(best, run)
    prev = k
  }
  return best
}

function longestGapBeforeDeposit(f: AchFacts): number {
  const days = [...new Set(f.deposits.map((e) => e.date))].sort()
  let gap = 0
  for (let i = 1; i < days.length; i++) gap = Math.max(gap, daysBetween(days[i - 1], days[i]))
  return gap
}

function hasPerfectWeek(f: AchFacts): boolean {
  const weeks = new Map<string, Set<string>>()
  for (const e of f.deposits) {
    const k = isoWeekKey(e.date)
    if (!weeks.has(k)) weeks.set(k, new Set())
    weeks.get(k)!.add(e.date)
  }
  for (const s of weeks.values()) if (s.size >= 7) return true
  return false
}

function hourOfEntry(e: Entry): number {
  return new Date(e.createdAt).getHours()
}

function volume(id: string, name: string, icon: string, amount: number, xp: number, tier: 1 | 2 | 3): Achievement {
  return {
    id, name, icon, family: 'volume', xp, tier,
    description: `Put aside ${amount.toLocaleString()} in total.`,
    test: (f) => f.totalDeposited >= money(amount),
    progress: (f) => clamp01(f.totalDeposited / money(amount)),
  }
}

function streakBadge(id: string, name: string, icon: string, weeks: number, xp: number, tier: 1 | 2 | 3): Achievement {
  return {
    id, name, icon, family: 'consistency', xp, tier,
    description: `Keep a ${weeks}-week saving streak alive.`,
    test: (f) => f.streak.longest >= weeks,
    progress: (f) => clamp01(f.streak.longest / weeks),
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  /* ---------------------------------------------------------- first steps */
  {
    id: 'first_deposit', name: 'First Coin', icon: '🪙', family: 'first', xp: 25, tier: 1,
    description: 'Log your very first deposit.',
    test: (f) => f.deposits.length >= 1,
  },
  {
    id: 'first_vault', name: 'Ground Broken', icon: '⛏️', family: 'first', xp: 25, tier: 1,
    description: 'Create your first vault.',
    test: (f) => f.vaults.length >= 1,
  },
  {
    id: 'ten_deposits', name: 'Getting the Hang', icon: '🎯', family: 'first', xp: 50, tier: 1,
    description: 'Log 10 deposits.',
    test: (f) => f.deposits.length >= 10,
    progress: (f) => clamp01(f.deposits.length / 10),
  },
  {
    id: 'first_complete', name: 'Vault Cracked', icon: '🗝️', family: 'first', xp: 150, tier: 2,
    description: 'Fill a vault all the way to its target.',
    test: (f) => f.completedVaults.length >= 1,
  },

  /* --------------------------------------------------------------- volume */
  volume('vol_100', 'Pocket Change', '💵', 100, 50, 1),
  volume('vol_500', 'Serious Now', '💸', 500, 75, 1),
  volume('vol_1k', 'Four Figures', '🏦', 1_000, 100, 2),
  volume('vol_5k', 'Small Hoard', '💰', 5_000, 200, 2),
  volume('vol_10k', 'Real Money', '🪩', 10_000, 300, 3),
  volume('vol_25k', 'Dragon Wealth', '🐲', 25_000, 500, 3),

  /* ---------------------------------------------------------- consistency */
  streakBadge('streak_4', 'Month of Mondays', '📅', 4, 100, 1),
  streakBadge('streak_12', 'One Quarter Down', '🗓️', 12, 200, 2),
  streakBadge('streak_26', 'Half a Year', '🌗', 26, 350, 3),
  streakBadge('streak_52', 'Year of the Wyrm', '🐉', 52, 500, 3),
  {
    id: 'days_30', name: 'Thirty Days', icon: '🌤️', family: 'consistency', xp: 100, tier: 1,
    description: 'Save on 30 different days.',
    test: (f) => f.streak.activeDays >= 30,
    progress: (f) => clamp01(f.streak.activeDays / 30),
  },
  {
    id: 'days_100', name: 'Century of Days', icon: '💯', family: 'consistency', xp: 300, tier: 3,
    description: 'Save on 100 different days.',
    test: (f) => f.streak.activeDays >= 100,
    progress: (f) => clamp01(f.streak.activeDays / 100),
  },
  {
    id: 'perfect_week', name: 'Perfect Week', icon: '✨', family: 'consistency', xp: 250, tier: 3,
    description: 'Deposit on all seven days of one week.',
    test: hasPerfectWeek,
  },
  {
    id: 'freeze_saved', name: 'Saved by the Ice', icon: '❄️', family: 'consistency', xp: 50, tier: 1,
    hidden: true,
    description: 'Have a streak freeze rescue a week you missed.',
    test: (f) => f.streak.frozenWeeks.length >= 1,
  },

  /* ----------------------------------------------------------- discipline */
  {
    id: 'clean_month', name: 'Untouched', icon: '🛡️', family: 'discipline', xp: 150, tier: 2,
    description: 'Complete a calendar month with deposits and no withdrawals.',
    test: hasCleanMonth,
  },
  {
    id: 'vaults_3', name: 'Collector', icon: '🏺', family: 'discipline', xp: 250, tier: 2,
    description: 'Finish three vaults.',
    test: (f) => f.completedVaults.length >= 3,
    progress: (f) => clamp01(f.completedVaults.length / 3),
  },
  {
    id: 'target_hit', name: 'On Target', icon: '🎪', family: 'discipline', xp: 100, tier: 1,
    description: 'Hit your monthly target for a full month.',
    test: (f) => consecutiveTargetMonths(f) >= 1,
  },
  {
    id: 'target_3', name: 'Three in a Row', icon: '🔱', family: 'discipline', xp: 300, tier: 3,
    description: 'Hit your monthly target three months running.',
    test: (f) => consecutiveTargetMonths(f) >= 3,
    progress: (f) => clamp01(consecutiveTargetMonths(f) / 3),
  },
  {
    id: 'multivault', name: 'Many Fronts', icon: '🗂️', family: 'discipline', xp: 100, tier: 1,
    description: 'Keep five vaults running at once.',
    test: (f) => f.activeVaultCount >= 5,
    progress: (f) => clamp01(f.activeVaultCount / 5),
  },
  {
    id: 'quest_25', name: 'Quest Runner', icon: '📜', family: 'discipline', xp: 200, tier: 2,
    description: 'Claim 25 quest rewards.',
    test: (f) => f.claimedQuestCount >= 25,
    progress: (f) => clamp01(f.claimedQuestCount / 25),
  },

  /* ---------------------------------------------------------------- story */
  {
    id: 'ontime', name: 'Beat the Clock', icon: '⏱️', family: 'story', xp: 150, tier: 2,
    description: 'Complete a vault on or before its deadline.',
    test: (f) => f.completedVaults.some(
      (v) => v.deadline != null && v.reachedAt != null && v.reachedAt <= v.deadline),
  },
  {
    id: 'christmas', name: 'Christmas Delivered', icon: '🎄', family: 'story', xp: 200, tier: 3,
    description: 'Finish a December-dated vault before the day.',
    test: (f) => f.completedVaults.some(
      (v) => v.deadline != null && v.deadline.slice(5, 7) === '12' &&
             v.reachedAt != null && v.reachedAt <= v.deadline),
  },
  {
    id: 'overachiever', name: 'Overachiever', icon: '🚀', family: 'story', xp: 200, tier: 2,
    description: 'Finish a month at 150% of your target.',
    test: (f) => f.monthlyTarget > 0 &&
      completedMonths(f).some((k) => (f.monthlyNet.get(k) ?? 0) >= f.monthlyTarget * 1.5),
  },
  {
    id: 'comeback', name: 'The Return', icon: '🔥', family: 'story', xp: 100, tier: 2, hidden: true,
    description: 'Come back and deposit after three weeks away.',
    test: (f) => longestGapBeforeDeposit(f) >= 21,
  },
  {
    id: 'big_one', name: "Dragon's Portion", icon: '💎', family: 'story', xp: 150, tier: 2,
    description: 'Land one deposit worth five times your average.',
    test: (f) => f.deposits.length >= 10 && f.records.averageDeposit > 0 &&
      (f.records.biggestSingle?.amount ?? 0) >= f.records.averageDeposit * 5,
  },
  {
    id: 'night_owl', name: 'Night Owl', icon: '🦉', family: 'story', xp: 25, tier: 1, hidden: true,
    description: 'Log a deposit between midnight and 5am.',
    test: (f) => f.deposits.some((e) => hourOfEntry(e) < 5),
  },
  {
    id: 'early_bird', name: 'Early Bird', icon: '🐦', family: 'story', xp: 25, tier: 1, hidden: true,
    description: 'Log a deposit before 6am.',
    test: (f) => f.deposits.some((e) => { const h = hourOfEntry(e); return h >= 5 && h < 6 }),
  },

  /* ------------------------------------------------- prestige (0 XP, see note) */
  {
    id: 'rank_vaultkeeper', name: 'Vaultkeeper', icon: '🔐', family: 'story', xp: 0, tier: 2,
    description: 'Reach level 10.',
    test: (f) => f.level >= 10,
    progress: (f) => clamp01(f.level / 10),
  },
  {
    id: 'rank_drakelord', name: 'Drakelord', icon: '🐉', family: 'story', xp: 0, tier: 3,
    description: 'Reach level 28.',
    test: (f) => f.level >= 28,
    progress: (f) => clamp01(f.level / 28),
  },
]

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))

export type AchievementView = Achievement & {
  unlocked: boolean
  unlockedAt: ISODate | null
  fraction: number
}

export function evaluateAchievements(
  facts: AchFacts,
  unlockedRecord: Record<string, ISODate>,
): AchievementView[] {
  return ACHIEVEMENTS.map((a) => {
    const unlocked = a.test(facts)
    return {
      ...a,
      unlocked,
      unlockedAt: unlockedRecord[a.id] ?? null,
      fraction: unlocked ? 1 : a.progress ? clamp01(a.progress(facts)) : 0,
    }
  })
}

/** XP from every currently-satisfied achievement. Derived, never stored. */
export function achievementXp(views: AchievementView[]): number {
  let xp = 0
  for (const v of views) if (v.unlocked) xp += v.xp
  return xp
}

export const FAMILY_LABEL: Record<AchFamily, string> = {
  first: 'First steps',
  volume: 'Volume',
  consistency: 'Consistency',
  discipline: 'Discipline',
  story: 'Story',
}
