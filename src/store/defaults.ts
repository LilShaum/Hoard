import type { AccentKey, State, Vault } from '@/domain/types'
import { todayISO } from '@/domain/dates'

export const SCHEMA_VERSION = 1
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
      theme: 'midnight',
      unlockedThemes: ['midnight'],
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
    },
  }
}

export type VaultDraft = {
  name: string
  emoji: string
  target: number | null
  deadline: string | null
  color: AccentKey
  note?: string
}

export function makeVault(draft: VaultDraft, today = todayISO()): Vault {
  return {
    id: newId('v_'),
    name: draft.name.trim() || 'Untitled vault',
    emoji: draft.emoji || '🎯',
    target: draft.target && draft.target > 0 ? Math.round(draft.target) : null,
    deadline: draft.deadline || null,
    color: draft.color,
    createdAt: today,
    completedAt: null,
    archived: false,
    note: draft.note?.trim() ?? '',
  }
}

/** Starter vaults offered during onboarding and from the empty state. */
export const VAULT_PRESETS: Array<VaultDraft & { blurb: string; monthsOut?: number; fixedDeadline?: string }> = [
  { name: 'Christmas',      emoji: '🎄', target: 50_000,  deadline: null, color: 'rose',   blurb: 'Presents, food, the lot', fixedDeadline: '12-20' },
  { name: 'Emergency fund', emoji: '🛟', target: 100_000, deadline: null, color: 'teal',   blurb: 'The one that lets you sleep' },
  { name: 'Trip',           emoji: '✈️', target: 150_000, deadline: null, color: 'azure',  blurb: 'Somewhere warm',      monthsOut: 8 },
  { name: 'New phone',      emoji: '📱', target: 90_000,  deadline: null, color: 'violet', blurb: 'Before this one dies', monthsOut: 6 },
  { name: 'Car',            emoji: '🚗', target: 400_000, deadline: null, color: 'gold',   blurb: 'Four wheels of freedom', monthsOut: 18 },
  { name: 'Concert',        emoji: '🎫', target: 25_000,  deadline: null, color: 'lime',   blurb: 'Tickets and a night out', monthsOut: 4 },
]

export const ACCENTS: AccentKey[] = ['gold', 'ember', 'rose', 'violet', 'azure', 'teal', 'lime', 'slate']

export const EMOJI_CHOICES = [
  '🎯', '🎄', '🛟', '✈️', '📱', '🚗', '🎫', '🏠', '🎓', '💍', '🎁', '🏝️',
  '🎮', '💻', '🚲', '🛠️', '🐕', '👟', '📷', '🎸', '🏋️', '🍜', '🎨', '⛺',
]
