import type { ThemeKey } from '@/domain/types'
import { RANKS } from '@/domain/xp'

export const THEME_LABEL: Record<string, string> = {
  midnight: 'Midnight',
  emberlight: 'Emberlight',
  deepsea: 'Deep Sea',
  verdant: 'Verdant',
  royal: 'Royal',
  ice: 'Ice',
  dragonfire: 'Dragonfire',
  aurum: 'Aurum',
  void: 'Void',
}

export type ThemeInfo = {
  key: ThemeKey
  label: string
  unlockLevel: number
  rankName: string
  swatch: [string, string]
}

/** Swatches mirror each theme's accent pair from tokens.css. */
const SWATCHES: Record<ThemeKey, [string, string]> = {
  midnight: ['#6b93ff', '#8b5cf6'],
  emberlight: ['#ff8a3d', '#ffc93d'],
  deepsea: ['#22d3ee', '#3b82f6'],
  verdant: ['#4ade80', '#a3e635'],
  royal: ['#a855f7', '#ec4899'],
  ice: ['#7dd3fc', '#c7d2fe'],
  dragonfire: ['#ff4d4d', '#ff9f1c'],
  aurum: ['#f5c451', '#e08a2e'],
  void: ['#b18cff', '#e6e6ff'],
}

export const THEMES: ThemeInfo[] = RANKS.map((r) => ({
  key: r.theme,
  label: THEME_LABEL[r.theme] ?? r.theme,
  unlockLevel: r.minLevel,
  rankName: r.name,
  swatch: SWATCHES[r.theme],
}))
