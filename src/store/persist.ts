import type { Entry, State, Vault } from '@/domain/types'
import { isValidISO, todayISO } from '@/domain/dates'
import { initialState, SCHEMA_VERSION, STORAGE_KEY } from './defaults'

/**
 * Persistence is deliberately paranoid. Anything coming back out of
 * localStorage — or out of a file the user imported — is treated as hostile:
 * every field is checked, coerced or dropped. A corrupt blob costs the user a
 * field, never the app.
 */

type Migration = (input: any) => any

/**
 * version N -> N+1. Empty today because v1 is the first schema; the chain
 * exists so the very first breaking change is a five-line addition rather than
 * a rewrite that eats everyone's history.
 */
/** Emoji vaults predate the drawn glyph set; map them onto their nearest glyph. */
const EMOJI_TO_GLYPH: Record<string, string> = {
  '🎯': 'coin', '🎄': 'gift', '🎁': 'gift', '🛟': 'wave', '✈️': 'plane', '🏝️': 'plane',
  '📱': 'phone', '🚗': 'car', '🎫': 'ticket', '🏠': 'house', '🎓': 'cap', '💍': 'ring',
  '🎮': 'laptop', '💻': 'laptop', '🚲': 'bike', '🛠️': 'tools', '🐕': 'paw', '👟': 'shoe',
  '📷': 'camera', '🎸': 'guitar', '🎨': 'guitar', '⛺': 'tent', '🏋️': 'bag', '🍜': 'bag',
}

/** The old free-floating accent names map onto the eight validated types. */
const COLOR_TO_TYPE: Record<string, string> = {
  gold: 'volt', ember: 'ember', rose: 'bloom', violet: 'wave',
  azure: 'wave', teal: 'frost', lime: 'leaf', slate: 'moss',
}

const OLD_THEME_TO_ACCENT: Record<string, string> = {
  midnight: 'field', emberlight: 'ember', deepsea: 'wave', verdant: 'leaf',
  royal: 'bloom', ice: 'frost', dragonfire: 'flare', aurum: 'volt', void: 'moss',
}

export const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2. Vaults carried an emoji and a loose accent name; they now carry a
   * drawn glyph and one of the eight types. Themes moved from nine whole
   * palettes to nine accents over one shared surface set.
   */
  1: (input: any) => ({
    ...input,
    vaults: Array.isArray(input?.vaults)
      ? input.vaults.map((v: any) => ({
          ...v,
          glyph: EMOJI_TO_GLYPH[v?.emoji] ?? 'coin',
          type: COLOR_TO_TYPE[v?.color] ?? 'wave',
        }))
      : input?.vaults,
    profile: {
      ...input?.profile,
      weeklyLimit: input?.profile?.weeklyLimit ?? 0,
      appearance: input?.profile?.appearance ?? 'system',
      theme: OLD_THEME_TO_ACCENT[input?.profile?.theme] ?? 'field',
      unlockedThemes: Array.isArray(input?.profile?.unlockedThemes)
        ? input.profile.unlockedThemes.map((t: string) => OLD_THEME_TO_ACCENT[t] ?? 'field')
        : ['field'],
    },
  }),
}

export function migrate(raw: any): any {
  let out = raw
  let version = typeof raw?.version === 'number' ? raw.version : 0
  // An unversioned blob predates versioning; treat it as v1-shaped and let the
  // sanitiser sort out the details.
  if (version === 0) version = 1
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) break
    out = step(out)
    version += 1
  }
  return { ...out, version: SCHEMA_VERSION }
}

/* ------------------------------------------------------------- sanitising */

const GLYPH_NAMES = [
  'gift', 'plane', 'phone', 'car', 'ticket', 'house', 'cap', 'ring', 'camera',
  'bike', 'guitar', 'tent', 'paw', 'shoe', 'laptop', 'tools', 'plant', 'wave',
  'bag', 'coin',
]
const TYPE_NAMES = ['wave', 'ember', 'leaf', 'volt', 'bloom', 'moss', 'frost', 'flare']
const THEME_NAMES = ['field', ...TYPE_NAMES]
const APPEARANCES = ['light', 'dark', 'system']

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback)

const int = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback

const date = (v: unknown, fallback: string | null = null): string | null =>
  isValidISO(v) ? v : fallback

function sanitiseVault(v: any, today: string): Vault | null {
  if (!v || typeof v !== 'object' || typeof v.id !== 'string' || !v.id) return null
  const target = int(v.target, 0)
  return {
    id: v.id,
    name: str(v.name, 'Untitled vault').slice(0, 80),
    glyph: (GLYPH_NAMES.includes(str(v.glyph)) ? v.glyph : 'coin') as Vault['glyph'],
    type: (TYPE_NAMES.includes(str(v.type)) ? v.type : 'wave') as Vault['type'],
    target: target > 0 ? target : null,
    deadline: date(v.deadline),
    createdAt: date(v.createdAt, today)!,
    completedAt: date(v.completedAt),
    archived: bool(v.archived),
    note: str(v.note).slice(0, 500),
  }
}

function sanitiseEntry(e: any, today: string): Entry | null {
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id) return null
  const amount = Math.abs(int(e.amount, 0))
  if (amount <= 0) return null
  return {
    id: e.id,
    // Spending never belongs to a vault, whatever a hand-edited file claims.
    vaultId: e.kind !== 'spend' && typeof e.vaultId === 'string' && e.vaultId ? e.vaultId : null,
    amount,
    kind: e.kind === 'withdrawal' || e.kind === 'spend' ? e.kind : 'deposit',
    date: date(e.date, today)!,
    note: str(e.note).slice(0, 200),
    createdAt: int(e.createdAt, Date.now()),
  }
}

function sanitiseRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof k === 'string' && typeof val === 'string') out[k] = val
  }
  return out
}

export function sanitise(raw: any): State {
  const base = initialState()
  const today = todayISO()
  if (!raw || typeof raw !== 'object') return base

  const p = raw.profile ?? {}
  const vaults = Array.isArray(raw.vaults)
    ? raw.vaults.map((v: any) => sanitiseVault(v, today)).filter(Boolean) as Vault[]
    : []
  const entries = Array.isArray(raw.entries)
    ? raw.entries.map((e: any) => sanitiseEntry(e, today)).filter(Boolean) as Entry[]
    : []

  // Dedupe by id — an import merged twice shouldn't double someone's savings.
  const seen = new Set<string>()
  const uniqueEntries = entries.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))

  const pr = raw.progress ?? {}
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: str(p.name).slice(0, 40),
      currency: /^[A-Z]{3}$/.test(str(p.currency)) ? p.currency : base.profile.currency,
      locale: str(p.locale, base.profile.locale),
      monthlyTarget: Math.max(0, int(p.monthlyTarget, 0)),
      weeklyLimit: Math.max(0, int(p.weeklyLimit, 0)),
      theme: (THEME_NAMES.includes(str(p.theme)) ? p.theme : 'field') as State['profile']['theme'],
      unlockedThemes: (Array.isArray(p.unlockedThemes)
        ? p.unlockedThemes.filter((t: unknown) => typeof t === 'string' && THEME_NAMES.includes(t))
        : ['field']) as State['profile']['unlockedThemes'],
      appearance: (APPEARANCES.includes(str(p.appearance)) ? p.appearance : 'system') as State['profile']['appearance'],
      sound: bool(p.sound, true),
      reduceMotion: bool(p.reduceMotion, false),
      onboarded: bool(p.onboarded, false),
      createdAt: date(p.createdAt, today)!,
    },
    vaults,
    entries: uniqueEntries,
    progress: {
      claimedQuests: sanitiseRecord(pr.claimedQuests),
      unlockedAchievements: sanitiseRecord(pr.unlockedAchievements),
      seenLevel: Math.max(1, int(pr.seenLevel, 1)),
      celebratedVaults: Array.isArray(pr.celebratedVaults)
        ? pr.celebratedVaults.filter((v: unknown) => typeof v === 'string')
        : [],
    },
  }
}

/* ------------------------------------------------------------------- I/O */

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    return sanitise(migrate(JSON.parse(raw)))
  } catch {
    // A private window, disabled storage, or a truncated blob. Start clean
    // rather than showing a broken app.
    return initialState()
  }
}

export type SaveResult = 'ok' | 'unavailable' | 'quota'

export function saveState(state: State): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return 'ok'
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? ''
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ? 'quota'
      : 'unavailable'
  }
}

export function exportState(state: State): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString(), app: 'hoard' }, null, 2)
}

export function importState(json: string): State | null {
  try {
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.entries) && !Array.isArray(parsed.vaults)) return null
    return sanitise(migrate(parsed))
  } catch {
    return null
  }
}
