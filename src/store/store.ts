import { useCallback, useSyncExternalStore } from 'react'
import type { State } from '@/domain/types'
import { derive, type Derived } from '@/domain/selectors'
import { todayISO } from '@/domain/dates'
import { loadState, saveState, type SaveResult } from './persist'
import { reducer, type Action } from './reducer'

/**
 * A ~60-line store instead of a state library. `useSyncExternalStore` gives us
 * correct tearing-free subscriptions in React 18, the reducer is a plain
 * function, and the derived view is memoised on state identity — so screens
 * recompute exactly when something actually changed.
 */

type Listener = () => void

const listeners = new Set<Listener>()
let state: State = loadState()
let saveStatus: SaveResult = 'ok'

/* The derived view is expensive-ish and read by every screen; cache it against
 * the state object and the current day, so a midnight rollover invalidates. */
let cacheKey: { state: State; day: string } | null = null
let cacheValue: Derived | null = null

function computeDerived(): Derived {
  const day = todayISO()
  if (cacheKey && cacheKey.state === state && cacheKey.day === day && cacheValue) return cacheValue
  cacheValue = derive(state, day)
  cacheKey = { state, day }
  return cacheValue
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    saveStatus = saveState(state)
  }, 200)
}

function emit() {
  for (const l of listeners) l()
}

export function dispatch(action: Action): void {
  const next = reducer(state, action)
  if (next === state) return
  state = next
  schedulePersist()
  emit()
}

/** Applies several actions as one render and one save. */
export function dispatchAll(actions: Action[]): void {
  let next = state
  for (const a of actions) next = reducer(next, a)
  if (next === state) return
  state = next
  schedulePersist()
  emit()
}

export function getState(): State {
  return state
}

export function getSaveStatus(): SaveResult {
  return saveStatus
}

/** Flushes any pending write immediately — used before unload. */
export function flush(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  saveStatus = saveState(state)
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useHoard(): Derived {
  return useSyncExternalStore(subscribe, computeDerived, computeDerived)
}

export function useRawState(): State {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function useSelector<T>(select: (s: State) => T): T {
  const get = useCallback(() => select(state), [select])
  return useSyncExternalStore(subscribe, get, get)
}

/** Test seam: replaces the whole store without touching storage. */
export function __setStateForTests(next: State): void {
  state = next
  cacheKey = null
  emit()
}
