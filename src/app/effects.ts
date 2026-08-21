import { useEffect, useRef } from 'react'
import type { Derived } from '@/domain/selectors'
import { ACHIEVEMENTS_BY_ID } from '@/domain/achievements'
import { themesUnlockedAt } from '@/domain/xp'
import { todayISO } from '@/domain/dates'
import { dispatch, dispatchAll, getState } from '@/store/store'
import type { Action } from '@/store/reducer'
import { toast } from '@/ui/toast'
import { confetti } from '@/ui/confetti'
import { haptic, soundComplete, soundLevelUp } from '@/ui/feedback'

export type LevelUp = { level: number; rankName: string; sigil: string; unlockedTheme: string | null }

let quietNext = false

/**
 * Call immediately before replacing the whole state (import, demo, reset).
 * Wholesale swaps are not achievements — without this, restoring a backup
 * greets the user with twenty toasts and a level-up modal for things they
 * earned months ago.
 */
export function suppressNextCelebration(): void {
  quietNext = true
}

/**
 * Watches the derived state for things worth celebrating and fires the reward
 * layer: toasts, confetti, sound, and the records that stop a celebration
 * repeating.
 *
 * The first pass after mount records silently. Otherwise loading a saved
 * account — or importing a backup — would open with a barrage of twenty toasts
 * for things the user did weeks ago.
 */
export function useGameEffects(d: Derived, onLevelUp: (info: LevelUp) => void): void {
  const settled = useRef(false)

  useEffect(() => {
    const today = todayISO()
    const state = getState()
    const quiet = !settled.current || quietNext
    const actions: Action[] = []

    /* --------------------------------------------------------- achievements */
    if (d.pendingAchievements.length > 0) {
      actions.push({ type: 'achievements/record', ids: d.pendingAchievements, date: today })
      if (!quiet) {
        // Stagger, so five at once read as a run of wins rather than a wall.
        d.pendingAchievements.slice(0, 4).forEach((id, i) => {
          const a = ACHIEVEMENTS_BY_ID[id]
          if (!a) return
          setTimeout(() => toast(`${a.name} unlocked`, a.icon, a.xp || undefined), 260 * i)
        })
      }
    }

    /* ------------------------------------------------------ vault completion */
    const freshlyDone = d.vaults.filter(
      (v) => v.isComplete && !state.progress.celebratedVaults.includes(v.id))
    for (const v of freshlyDone) actions.push({ type: 'vault/celebrated', id: v.id })
    if (!quiet && freshlyDone.length > 0) {
      confetti({ count: 130, power: 1.15 })
      soundComplete()
      haptic([18, 60, 18, 60, 40])
      toast(`${freshlyDone[0].name} is full!`, freshlyDone[0].emoji)
    }

    /* --------------------------------------------------------- theme unlocks */
    const earned = themesUnlockedAt(d.level.level)
    const missing = earned.filter((t) => !state.profile.unlockedThemes.includes(t))
    if (missing.length > 0) actions.push({ type: 'theme/unlock', themes: missing })

    /* -------------------------------------------------------------- level up */
    if (d.level.level > state.progress.seenLevel) {
      actions.push({ type: 'level/seen', level: d.level.level })
      if (!quiet) {
        onLevelUp({
          level: d.level.level,
          rankName: d.rank.name,
          sigil: d.rank.sigil,
          unlockedTheme: missing.length > 0 ? missing[missing.length - 1] : null,
        })
        soundLevelUp()
        haptic([12, 40, 12, 40, 60])
      }
    }

    if (actions.length > 0) dispatchAll(actions)
    settled.current = true
    quietNext = false
  }, [d, onLevelUp])
}

/** Keeps the <html> theme attribute and reduced-motion flag in sync. */
export function useThemeEffect(theme: string, reduceMotion: boolean): void {
  useEffect(() => {
    document.documentElement.dataset.hoardTheme = theme
    document.body.dataset.reduceMotion = String(reduceMotion)
    const meta = document.querySelector('meta[name="theme-color"]')
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    if (meta && bg) meta.setAttribute('content', bg)
  }, [theme, reduceMotion])
}

/** Flushes pending writes when the tab goes away mid-edit. */
export function usePersistOnHide(flush: () => void): void {
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [flush])
}

/** Re-renders the app when the calendar day rolls over while it's open. */
export function useMidnightRefresh(onRoll: () => void): void {
  const dayRef = useRef(todayISO())
  useEffect(() => {
    const check = () => {
      const now = todayISO()
      if (now !== dayRef.current) {
        dayRef.current = now
        onRoll()
      }
    }
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [onRoll])
}

export { dispatch }
