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
    glyph: 'coin',
    type: 'wave',
    target: 100_000,
    deadline: null,
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
      weeklyLimit: 0,
      theme: 'field',
      unlockedThemes: ['field'],
      appearance: 'light',
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
      lastDistributedWeek: null,
      lastBackupAt: null,
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
