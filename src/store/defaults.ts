import type { GlyphName, State, TypeKey, Vault } from '@/domain/types'
import { todayISO } from '@/domain/dates'

export const SCHEMA_VERSION = 2
export const STORAGE_KEY = 'hoard.state'

export function newId(prefix = ''): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return prefix + c.randomUUID()
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** Guesses a currency from the browser locale, so first-run defaults feel local. */
export function guessLocale(): { locale: string; currency: string } {
  const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'
  const region = locale.split('-')[1]?.toUpperCase()
  const byRegion: Record<string, string> = {
    US: 'USD', GB: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR',
    NL: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR',
    CA: 'CAD', AU: 'AUD', NZ: 'NZD', JP: 'JPY', IN: 'INR', SE: 'SEK',
    NO: 'NOK', DK: 'DKK', CH: 'CHF', ZA: 'ZAR', BR: 'BRL', MX: 'MXN',
    SG: 'SGD', PL: 'PLN',
  }
  return { locale, currency: (region && byRegion[region]) || 'USD' }
}

export function initialState(): State {
  const { locale, currency } = guessLocale()
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: '',
      currency,
      locale,
      monthlyTarget: 0,
      weeklyLimit: 0,
      theme: 'field',
      unlockedThemes: ['field'],
      appearance: 'system',
      sound: true,
      reduceMotion: false,
      onboarded: false,
      createdAt: todayISO(),
    },
    vaults: [],
    entries: [],
    progress: {
      claimedQuests: {},
      unlockedAchievements: {},
      seenLevel: 1,
      celebratedVaults: [],
      lastDistributedWeek: null,
    },
  }
}

export type VaultDraft = {
  name: string
  glyph: GlyphName
  type: TypeKey
  target: number | null
  deadline: string | null
  note?: string
}

export function makeVault(draft: VaultDraft, today = todayISO()): Vault {
  return {
    id: newId('v_'),
    name: draft.name.trim() || 'Untitled vault',
    glyph: draft.glyph,
    type: draft.type,
    target: draft.target && draft.target > 0 ? Math.round(draft.target) : null,
    deadline: draft.deadline || null,
    createdAt: today,
    completedAt: null,
    archived: false,
    note: draft.note?.trim() ?? '',
  }
}

/** Starter vaults offered during onboarding and from the empty state. */
export const VAULT_PRESETS: Array<VaultDraft & { blurb: string; monthsOut?: number; fixedDeadline?: string }> = [
  { name: 'Christmas',      glyph: 'gift',  type: 'bloom', target: 50_000,  deadline: null, blurb: 'Presents, food, the lot', fixedDeadline: '12-20' },
  { name: 'Emergency fund', glyph: 'wave',  type: 'frost', target: 100_000, deadline: null, blurb: 'The one that lets you sleep' },
  { name: 'Trip',           glyph: 'plane', type: 'wave',  target: 150_000, deadline: null, blurb: 'Somewhere warm',          monthsOut: 8 },
  { name: 'New phone',      glyph: 'phone', type: 'leaf',  target: 90_000,  deadline: null, blurb: 'Before this one dies',    monthsOut: 6 },
  { name: 'Car',            glyph: 'car',   type: 'volt',  target: 400_000, deadline: null, blurb: 'Four wheels of freedom',  monthsOut: 18 },
  { name: 'Concert',        glyph: 'ticket', type: 'ember', target: 25_000, deadline: null, blurb: 'Tickets and a night out', monthsOut: 4 },
]

export const TYPE_KEYS: TypeKey[] = ['wave', 'ember', 'leaf', 'volt', 'bloom', 'moss', 'frost', 'flare']

export const TYPE_LABEL: Record<TypeKey, string> = {
  wave: 'Wave', ember: 'Ember', leaf: 'Leaf', volt: 'Volt',
  bloom: 'Bloom', moss: 'Moss', frost: 'Frost', flare: 'Flare',
}
