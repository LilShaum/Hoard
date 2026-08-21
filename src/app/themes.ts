import type { ThemeKey } from '@/domain/types'
import { RANKS } from '@/domain/xp'

export const THEME_LABEL: Record<ThemeKey, string> = {
  field: 'Field',
  wave: 'Wave',
  ember: 'Ember',
  leaf: 'Leaf',
  volt: 'Volt',
  bloom: 'Bloom',
  moss: 'Moss',
  frost: 'Frost',
  flare: 'Flare',
}

/** Swatches mirror the light-mode type hues in tokens.css. */
export const THEME_SWATCH: Record<ThemeKey, string> = {
  field: '#234a6e',
  wave: '#2a78d6',
  ember: '#eb6834',
  leaf: '#1baf7a',
  volt: '#eda100',
  bloom: '#e87ba4',
  moss: '#008300',
  frost: '#0099b0',
  flare: '#e34948',
}

export type ThemeInfo = {
  key: ThemeKey
  label: string
  unlockLevel: number
  rankName: string
  swatch: string
}

export const THEMES: ThemeInfo[] = RANKS.map((r) => ({
  key: r.theme,
  label: THEME_LABEL[r.theme],
  unlockLevel: r.minLevel,
  rankName: r.name,
  swatch: THEME_SWATCH[r.theme],
}))
