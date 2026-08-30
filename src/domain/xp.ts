import type { Cents, ThemeKey } from './types'

/**
 * The progression curve.
 *
 * Two properties matter and they pull against each other:
 *  - a small saver must be able to climb (so XP can't be linear in money), and
 *  - a large saver must not be able to buy the ladder (so it can't be linear either).
 * A logarithmic deposit reward with a super-linear level curve gives both: the
 * first levels arrive within one session, level 50 is a genuine long game.
 */

/** Cumulative XP required to *reach* a given level. Level 1 is 0. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round((50 * Math.pow(level - 1, 1.75)) / 10) * 10
}

export const MAX_LEVEL = 60

export type LevelInfo = {
  level: number
  xp: number
  /** XP accumulated since this level began. */
  xpIntoLevel: number
  /** XP span of the current level (0 at max level). */
  xpForLevel: number
  /** 0–1 through the current level. */
  progress: number
  /** XP still needed for the next level (0 at max level). */
  xpToNext: number
  isMax: boolean
}

export function levelForXp(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  while (level < MAX_LEVEL && total >= xpForLevel(level + 1)) level++

  const floor = xpForLevel(level)
  const ceil = level >= MAX_LEVEL ? floor : xpForLevel(level + 1)
  const span = ceil - floor
  const into = total - floor

  return {
    level,
    xp: total,
    xpIntoLevel: into,
    xpForLevel: span,
    progress: span > 0 ? Math.min(1, into / span) : 1,
    xpToNext: span > 0 ? Math.max(0, ceil - total) : 0,
    isMax: level >= MAX_LEVEL,
  }
}

/* ------------------------------------------------------------------ ranks */

export type Rank = {
  key: string
  name: string
  minLevel: number
  /** Accent theme unlocked on reaching this rank. */
  theme: ThemeKey
  blurb: string
}

/**
 * The player's rank. Distinct from the companion's evolution line: you rank up,
 * and your companion evolves on its own schedule — two ladders that reward
 * different lengths of commitment.
 */
/**
 * The ladder belongs to the hoard, not to a party sheet. Novice / Forager /
 * Ranger / Adept are generic fantasy-RPG classes — they could sit in any game
 * and say nothing about a dragon growing into the thing that guards your gold,
 * which is the one idea this whole app is named after. Every title now names
 * a stage of keeping a hoard.
 *
 * Each rank also unlocks an accent theme; those keys are unchanged.
 */
export const RANKS: Rank[] = [
  { key: 'scavenger',   name: 'Scavenger',   minLevel: 1,  theme: 'field', blurb: 'Every hoard starts with one coin.' },
  { key: 'glintseeker', name: 'Glintseeker', minLevel: 3,  theme: 'leaf',  blurb: 'Small, quick, and already collecting.' },
  { key: 'nestkeeper',  name: 'Nestkeeper',  minLevel: 6,  theme: 'wave',  blurb: 'The habit has teeth now.' },
  { key: 'coinwarden',  name: 'Coinwarden',  minLevel: 10, theme: 'volt',  blurb: 'You keep what you catch.' },
  { key: 'goldscale',   name: 'Goldscale',   minLevel: 15, theme: 'ember', blurb: 'Consistency is starting to show.' },
  { key: 'trovekeeper', name: 'Trovekeeper', minLevel: 21, theme: 'frost', blurb: 'You do not spend what you have not decided to spend.' },
  { key: 'hoardwarden', name: 'Hoardwarden', minLevel: 28, theme: 'flare', blurb: 'The pile has a shape. And a guard.' },
  { key: 'hoardmaster', name: 'Hoardmaster', minLevel: 36, theme: 'bloom', blurb: 'Saving is no longer something you try to do.' },
  { key: 'sovereign',   name: 'Sovereign',   minLevel: 45, theme: 'moss',  blurb: 'Legendary. Genuinely.' },
]

export function rankForLevel(level: number): Rank {
  let out = RANKS[0]
  for (const r of RANKS) if (level >= r.minLevel) out = r
  return out
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null
}

/** Every theme unlocked at or below `level`. */
export function themesUnlockedAt(level: number): ThemeKey[] {
  return RANKS.filter((r) => level >= r.minLevel).map((r) => r.theme)
}

/* ------------------------------------------------------------- XP sources */

/**
 * Deposit XP. Logarithmic: $5 → 15xp, $50 → 31xp, $500 → 57xp, $5,000 → 85xp.
 * Ten times the money is nowhere near ten times the reward.
 */
export function xpForDeposit(cents: Cents): number {
  const units = Math.max(0, cents) / 100
  if (units <= 0) return 0
  return Math.round(10 + 12 * Math.log(1 + units / 10))
}

/** Only the first N deposits of a day earn XP, so splitting can't farm it. */
export const XP_DEPOSITS_PER_DAY = 3

export function xpForVaultCompletion(target: Cents | null): number {
  const units = Math.max(0, target ?? 0) / 100
  return Math.round(200 + 40 * Math.log(1 + units / 100))
}

export function xpForStreakWeek(streakWeeks: number): number {
  return 25 + 5 * Math.min(Math.max(streakWeeks, 1), 20)
}

export const XP_MONTHLY_TARGET = 300

export const XP_QUEST: Record<'daily' | 'weekly' | 'monthly', number> = {
  daily: 50,
  weekly: 100,
  monthly: 150,
}
