import type { Cents, Entry, ISODate, State, Vault } from '../types'
import { addDays } from '../dates'

let seq = 0
export const resetSeq = () => { seq = 0 }

export function entry(date: ISODate, amount: Cents, over: Partial<Entry> = {}): Entry {
  seq += 1
  return {
    id: `e${seq}`,
    vaultId: null,
    amount,
    kind: 'deposit',
    date,
    note: '',
    // Deterministic 10:00 local so hour-based badges don't fire by accident.
    createdAt: new Date(`${date}T10:00:00`).getTime() + seq,
    ...over,
  }
}

export function vault(over: Partial<Vault> = {}): Vault {
  seq += 1
  return {
    id: `v${seq}`,
    name: 'Vault',
    emoji: '🎯',
    target: 100_000,
    deadline: null,
    color: 'gold',
    createdAt: '2026-01-01',
    completedAt: null,
    archived: false,
    note: '',
    ...over,
  }
}

export function state(over: Partial<State> = {}): State {
  return {
    version: 1,
    profile: {
      name: 'Tester',
      currency: 'USD',
      locale: 'en-US',
      monthlyTarget: 40_000,
      theme: 'midnight',
      unlockedThemes: ['midnight'],
      sound: false,
      reduceMotion: false,
      onboarded: true,
      createdAt: '2026-01-01',
    },
    vaults: [],
    entries: [],
    progress: {
      claimedQuests: {},
      unlockedAchievements: {},
      seenLevel: 1,
      celebratedVaults: [],
    },
    ...over,
  }
}

/** One deposit a week for `weeks` weeks, the last of them on `lastDate`. */
export function weeklyDeposits(
  lastDate: ISODate,
  weeks: number,
  amount: Cents,
  over: Partial<Entry> = {},
): Entry[] {
  const out: Entry[] = []
  for (let i = weeks - 1; i >= 0; i--) out.push(entry(addDays(lastDate, -7 * i), amount, over))
  return out
}
