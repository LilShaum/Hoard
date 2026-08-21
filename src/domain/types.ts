/** A local calendar day, 'YYYY-MM-DD'. Never a Date — timezones eat those. */
export type ISODate = string

/** Keys of the drawn vault glyph set — see ui/Glyphs.tsx. */
export type GlyphName =
  | 'gift' | 'plane' | 'phone' | 'car' | 'ticket' | 'house' | 'cap' | 'ring'
  | 'camera' | 'bike' | 'guitar' | 'tent' | 'paw' | 'shoe' | 'laptop' | 'tools'
  | 'plant' | 'wave' | 'bag' | 'coin'

/** Money, always integer minor units (cents/pence). Floats never touch money. */
export type Cents = number

/**
 * The eight creature types. A vault's type is its identity — it drives the
 * colour everywhere the vault appears, and the eight hues are the validated
 * categorical palette, so colour here is information rather than decoration.
 */
export type TypeKey =
  | 'wave' | 'ember' | 'leaf' | 'volt' | 'bloom' | 'moss' | 'frost' | 'flare'

/** Accent themes: the neutral default plus one per type, unlocked by rank. */
export type ThemeKey = 'field' | TypeKey

/** Light, dark, or follow the device. */
export type Appearance = 'light' | 'dark' | 'system'

export type Vault = {
  id: string
  name: string
  glyph: GlyphName
  type: TypeKey
  /** null = open-ended, just accumulate. */
  target: Cents | null
  /** null = no date pressure. */
  deadline: ISODate | null
  createdAt: ISODate
  completedAt: ISODate | null
  archived: boolean
  note: string
}

/**
 * Three distinct movements, deliberately not collapsed into a signed amount:
 *  - `deposit`     money put into the hoard
 *  - `withdrawal`  money taken back out of the hoard
 *  - `spend`       money spent from the everyday account — it never touches the
 *                  hoard balance at all, and exists only to be measured against
 *                  the weekly spending limit
 * Treating a spend as a negative deposit would quietly make the savings total a
 * lie, which is the one number the whole app is about.
 */
export type EntryKind = 'deposit' | 'withdrawal' | 'spend'

export type Entry = {
  id: string
  /** null = the general hoard, and always null for a spend. */
  vaultId: string | null
  /** Always positive; `kind` carries the direction. */
  amount: Cents
  kind: EntryKind
  date: ISODate
  note: string
  createdAt: number
}

/**
 * Note: there is no stored `xp`. Every point of XP is *derived* from entries,
 * vaults, claimed quests and unlocked achievements, so it can never drift out
 * of sync with reality — and imported or demo data lands at the right level for
 * free.
 */
export type Profile = {
  name: string
  currency: string
  locale: string
  /** The monthly deposit goal — how much to put away each month. */
  monthlyTarget: Cents
  /** The weekly spending limit — how much to spend each week. 0 = not set. */
  weeklyLimit: Cents
  theme: ThemeKey
  unlockedThemes: ThemeKey[]
  appearance: Appearance
  sound: boolean
  reduceMotion: boolean
  onboarded: boolean
  createdAt: ISODate
}

export type ProgressState = {
  /** questId -> date claimed */
  claimedQuests: Record<string, ISODate>
  /** achievementId -> date unlocked */
  unlockedAchievements: Record<string, ISODate>
  /** Highest level the user has been shown a level-up for. */
  seenLevel: number
  /** Vault ids we've already celebrated, so completion fires once. */
  celebratedVaults: string[]
}

export type State = {
  version: number
  profile: Profile
  vaults: Vault[]
  entries: Entry[]
  progress: ProgressState
}
