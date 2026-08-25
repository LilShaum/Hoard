import type { Cents, Entry, ISODate, State, Vault } from './types'
import {
  daysLeftInMonth, formatMonthLabel, monthEnd, monthKey, monthStart, todayISO,
} from './dates'
import { clamp01, ratio } from './money'
import { computeBudget, type BudgetView } from './budget'
import { backupStatus, type BackupStatus } from './backup'
import { computePace, type Pace } from './pace'
import { computeStreak, type StreakInfo } from './streak'
import {
  byMonth, depositDays as depositDaysOf, depositsOf, externalOnly, netOf,
  records as computeRecords, isNewMoney, signed, spendOf, withdrawalsOf, type Records,
} from './stats'
import {
  levelForXp, nextRank as nextRankFor, rankForLevel, xpForDeposit, xpForVaultCompletion,
  XP_DEPOSITS_PER_DAY, XP_MONTHLY_TARGET, type LevelInfo, type Rank,
} from './xp'
import { claimedQuestXp, generateQuests, type Quest } from './quests'
import {
  achievementXp, evaluateAchievements, type AchFacts, type AchievementView,
} from './achievements'
import {
  distributedThisWeek, planDistribution, shouldOfferDistribution, weeksOfRunway, type Plan,
} from './allocate'

/**
 * One function turns `State` into everything every screen needs. Nothing here is
 * cached in storage, so there is no possible disagreement between what's saved
 * and what's shown — the entire class of "my level says 12 but the bar says 9"
 * bugs is designed out rather than tested for.
 */

export type VaultView = Vault & {
  saved: Cents
  deposited: Cents
  withdrawn: Cents
  entries: Entry[]
  pace: Pace
  /** Currently at or above target. */
  isComplete: boolean
  /** The day the target was first reached (derived), or a manual close date. */
  reachedAt: ISODate | null
  entryCount: number
  lastEntry: ISODate | null
}

export type MonthView = {
  key: string
  label: string
  saved: Cents
  target: Cents
  fraction: number
  remaining: Cents
  daysLeft: number
  /** Where they'd be if the month were spread evenly. */
  expectedFraction: number
  onPace: boolean
  hit: boolean
}

export type XpBreakdown = {
  deposits: number
  vaults: number
  streak: number
  monthly: number
  quests: number
  achievements: number
  total: number
}

export type Derived = {
  today: ISODate
  entries: Entry[]
  recent: Entry[]
  vaults: VaultView[]
  activeVaults: VaultView[]
  completedVaults: VaultView[]
  archivedVaults: VaultView[]
  vaultById: Map<string, VaultView>
  generalSaved: Cents
  totalSaved: Cents
  totalDeposited: Cents
  totalWithdrawn: Cents
  streak: StreakInfo
  budget: BudgetView
  totalSpent: Cents
  level: LevelInfo
  rank: Rank
  nextRank: Rank | null
  xp: XpBreakdown
  month: MonthView
  quests: Quest[]
  achievements: AchievementView[]
  /** Unlocked by predicate but not yet recorded — the UI celebrates these. */
  pendingAchievements: string[]
  records: Records
  depositDays: ISODate[]
  hasData: boolean
  /** This week's proposed move from the Bank into vaults that need it. */
  bankPlan: Plan
  /** Whether that plan should be surfaced — not yet taken this week, and non-empty. */
  offerDistribution: boolean
  /** Whole weeks the Bank could keep funding the current plan. */
  bankRunway: number
  /** What this week's distribution already moved out of the Bank. */
  distributedThisWeek: Cents
  /** Whether the history on this device is overdue a backup, and what is at risk. */
  backup: BackupStatus
}

/** Chronological, then by insertion — the order money actually moved. */
function chronological(entries: Entry[]): Entry[] {
  return entries.slice().sort((a, b) =>
    a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1)
}

/** The day cumulative savings first crossed the target, or null. */
function reachedDate(target: Cents | null, entries: Entry[]): ISODate | null {
  if (target == null || target <= 0) return null
  let running = 0
  for (const e of chronological(entries)) {
    running += signed(e)
    if (running >= target) return e.date
  }
  return null
}

/** XP from deposits, honouring the per-day cap that stops split-deposit farming. */
function depositXp(entries: Entry[]): number {
  const perDay = new Map<ISODate, Entry[]>()
  for (const e of entries) {
    if (!isNewMoney(e)) continue
    const list = perDay.get(e.date)
    if (list) list.push(e)
    else perDay.set(e.date, [e])
  }
  let xp = 0
  for (const list of perDay.values()) {
    list.sort((a, b) => b.amount - a.amount) // the largest deposits are the ones that count
    for (const e of list.slice(0, XP_DEPOSITS_PER_DAY)) xp += xpForDeposit(e.amount)
  }
  return xp
}

function monthlyTargetXp(monthly: Map<string, Cents>, target: Cents, today: ISODate): number {
  if (target <= 0) return 0
  let hits = 0
  for (const [key, value] of monthly) {
    const ended = monthEnd(`${key}-01`) < today
    if (value >= target && (ended || key === monthKey(today))) hits++
  }
  return hits * XP_MONTHLY_TARGET
}

export function derive(state: State, today: ISODate = todayISO()): Derived {
  const entries = chronological(state.entries)
  const byVault = new Map<string, Entry[]>()
  const general: Entry[] = []
  for (const e of entries) {
    if (e.kind === 'spend') continue
    if (e.vaultId == null) general.push(e)
    else {
      const list = byVault.get(e.vaultId)
      if (list) list.push(e)
      else byVault.set(e.vaultId, [e])
    }
  }

  const vaults: VaultView[] = state.vaults.map((v) => {
    const ve = byVault.get(v.id) ?? []
    const saved = netOf(ve)
    const reached = v.completedAt ?? reachedDate(v.target, ve)
    return {
      ...v,
      saved,
      deposited: depositsOf(ve),
      withdrawn: withdrawalsOf(ve),
      entries: ve,
      pace: computePace(v, ve, saved, today),
      isComplete: v.target != null && v.target > 0 && saved >= v.target,
      reachedAt: reached,
      entryCount: ve.length,
      lastEntry: ve.length ? ve[ve.length - 1].date : null,
    }
  })

  const vaultById = new Map(vaults.map((v) => [v.id, v]))
  const live = vaults.filter((v) => !v.archived)
  const activeVaults = live.filter((v) => !v.isComplete)
  const completedVaults = live.filter((v) => v.isComplete)
  const archivedVaults = vaults.filter((v) => v.archived)

  /*
   * Two streams from here on, and the split matters.
   *
   * `entries` is every movement, and every *balance* is computed from it —
   * a Bank distribution really does move money, so the Bank falls and the
   * vault rises.
   *
   * `external` drops both halves of those internal moves, and every measure of
   * *behaviour* runs on it — quests, badges, streaks, records, the heatmap.
   * Without the split, distributing to three vaults would read as three
   * deposits (earning quests it did not deserve) while its matching Bank
   * withdrawal would break a no-withdrawals badge it never actually broke.
   */
  const external = externalOnly(entries)

  const totalSaved = netOf(entries)
  const totalDeposited = depositsOf(entries)
  const totalWithdrawn = withdrawalsOf(entries)
  const totalSpent = spendOf(entries)
  const generalSaved = netOf(general)
  const budget = computeBudget(entries, state.profile.weeklyLimit, today)

  const bankPlan = planDistribution(vaults, generalSaved)
  const offerDistribution = shouldOfferDistribution(bankPlan, state.progress.lastDistributedWeek, today)
  const bankRunway = weeksOfRunway(bankPlan)
  const backup = backupStatus(entries, state.progress.lastBackupAt)
  const sentThisWeek = distributedThisWeek(entries, today)

  const depositDays = depositDaysOf(external)
  const streak = computeStreak(depositDays, today)
  const monthly = byMonth(external)
  const records = computeRecords(external)

  /* ------------------------------------------------------------- this month */
  const mKey = monthKey(today)
  const mSaved = Math.max(0, monthly.get(mKey) ?? 0)
  const mTarget = state.profile.monthlyTarget
  const daysLeft = daysLeftInMonth(today)
  const monthLen = Number(monthEnd(today).slice(8))
  const dayOfMonth = Number(today.slice(8))
  const expectedFraction = clamp01(dayOfMonth / monthLen)
  const month: MonthView = {
    key: mKey,
    label: formatMonthLabel(mKey),
    saved: mSaved,
    target: mTarget,
    fraction: clamp01(ratio(mSaved, mTarget)),
    remaining: Math.max(0, mTarget - mSaved),
    daysLeft,
    expectedFraction,
    onPace: mTarget <= 0 || ratio(mSaved, mTarget) >= expectedFraction,
    hit: mTarget > 0 && mSaved >= mTarget,
  }

  /* -------------------------------------------------------------------- XP */
  const xpDeposits = depositXp(external)
  const xpVaults = vaults
    .filter((v) => v.reachedAt != null)
    .reduce((sum, v) => sum + xpForVaultCompletion(v.target), 0)
  const xpMonthly = monthlyTargetXp(monthly, mTarget, today)
  const xpQuests = claimedQuestXp(state.progress.claimedQuests)

  // Achievements need a level, and contribute XP that feeds the level. We break
  // the loop by evaluating them against the level from all *other* sources; the
  // only level-gated badges award 0 XP, so this is exact, not an approximation.
  const preXp = xpDeposits + xpVaults + streak.totalStreakXp + xpMonthly + xpQuests
  const preLevel = levelForXp(preXp).level

  const facts: AchFacts = {
    today,
    entries: external,
    deposits: external.filter((e) => e.kind === 'deposit'),
    withdrawals: external.filter((e) => e.kind === 'withdrawal'),
    vaults: state.vaults,
    completedVaults: vaults.filter((v) => v.reachedAt != null),
    totalDeposited,
    totalSaved,
    streak,
    records,
    monthlyNet: monthly,
    monthlyTarget: mTarget,
    weeklyLimit: state.profile.weeklyLimit,
    budget,
    level: preLevel,
    claimedQuestCount: Object.keys(state.progress.claimedQuests).length,
    activeVaultCount: live.length,
  }

  const achievements = evaluateAchievements(facts, state.progress.unlockedAchievements)
  const xpAchievements = achievementXp(achievements)

  const xp: XpBreakdown = {
    deposits: xpDeposits,
    vaults: xpVaults,
    streak: streak.totalStreakXp,
    monthly: xpMonthly,
    quests: xpQuests,
    achievements: xpAchievements,
    total: preXp + xpAchievements,
  }

  const level = levelForXp(xp.total)
  const rank = rankForLevel(level.level)

  const quests = generateQuests({
    today,
    entries: external,
    vaults: state.vaults,
    monthlyTarget: mTarget,
    weeklyLimit: state.profile.weeklyLimit,
    claimed: state.progress.claimedQuests,
  })

  const pendingAchievements = achievements
    .filter((a) => a.unlocked && !a.unlockedAt)
    .map((a) => a.id)

  return {
    today,
    entries,
    recent: entries.slice(-12).reverse(),
    vaults,
    activeVaults,
    completedVaults,
    archivedVaults,
    vaultById,
    generalSaved,
    totalSaved,
    totalDeposited,
    totalWithdrawn,
    totalSpent,
    streak,
    budget,
    level,
    rank,
    nextRank: nextRankFor(level.level),
    xp,
    month,
    quests,
    achievements,
    pendingAchievements,
    records,
    depositDays,
    hasData: entries.length > 0,
    bankPlan,
    offerDistribution,
    bankRunway,
    distributedThisWeek: sentThisWeek,
    backup,
  }
}

/** Entries inside the current month — used by the month recap. */
export function monthEntries(entries: Entry[], today: ISODate): Entry[] {
  const from = monthStart(today)
  const to = monthEnd(today)
  return entries.filter((e) => e.date >= from && e.date <= to)
}
