import type { Cents, Entry, EntryKind, ISODate, Profile, State, ThemeKey, Vault } from '@/domain/types'
import { todayISO } from '@/domain/dates'
import { newId, type VaultDraft, makeVault } from './defaults'

export type Action =
  | { type: 'entry/add'; entry: Entry }
  | { type: 'entry/update'; id: string; patch: Partial<Omit<Entry, 'id'>> }
  | { type: 'entry/delete'; id: string }
  | { type: 'vault/add'; vault: Vault }
  | { type: 'vault/update'; id: string; patch: Partial<Omit<Vault, 'id'>> }
  | { type: 'vault/delete'; id: string }
  | { type: 'vault/celebrated'; id: string }
  | { type: 'quest/claim'; id: string; date: ISODate }
  | { type: 'achievements/record'; ids: string[]; date: ISODate }
  | { type: 'level/seen'; level: number }
  | { type: 'profile/update'; patch: Partial<Profile> }
  | { type: 'theme/unlock'; themes: ThemeKey[] }
  | { type: 'entries/add'; entries: Entry[] }
  | { type: 'bank/distributed'; week: string }
  | { type: 'state/replace'; state: State }

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'entry/add':
      return { ...state, entries: [...state.entries, action.entry] }

    // A distribution is many entries that must land together — one of them
    // arriving without the others would leave the books unbalanced.
    case 'entries/add':
      return action.entries.length === 0
        ? state
        : { ...state, entries: [...state.entries, ...action.entries] }

    case 'bank/distributed':
      return state.progress.lastDistributedWeek === action.week
        ? state
        : { ...state, progress: { ...state.progress, lastDistributedWeek: action.week } }

    case 'entry/update':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)),
      }

    case 'entry/delete':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) }

    case 'vault/add':
      return { ...state, vaults: [...state.vaults, action.vault] }

    case 'vault/update':
      return {
        ...state,
        vaults: state.vaults.map((v) => (v.id === action.id ? { ...v, ...action.patch } : v)),
      }

    case 'vault/delete':
      // Money is never destroyed with the vault — it falls back to the general
      // hoard, so the totals a user has watched grow stay true.
      return {
        ...state,
        vaults: state.vaults.filter((v) => v.id !== action.id),
        entries: state.entries.map((e) =>
          e.vaultId === action.id ? { ...e, vaultId: null } : e),
      }

    case 'vault/celebrated':
      return state.progress.celebratedVaults.includes(action.id)
        ? state
        : {
            ...state,
            progress: {
              ...state.progress,
              celebratedVaults: [...state.progress.celebratedVaults, action.id],
            },
          }

    case 'quest/claim':
      return state.progress.claimedQuests[action.id]
        ? state
        : {
            ...state,
            progress: {
              ...state.progress,
              claimedQuests: { ...state.progress.claimedQuests, [action.id]: action.date },
            },
          }

    case 'achievements/record': {
      const fresh = action.ids.filter((id) => !state.progress.unlockedAchievements[id])
      if (fresh.length === 0) return state
      const next = { ...state.progress.unlockedAchievements }
      for (const id of fresh) next[id] = action.date
      return { ...state, progress: { ...state.progress, unlockedAchievements: next } }
    }

    case 'level/seen':
      return action.level <= state.progress.seenLevel
        ? state
        : { ...state, progress: { ...state.progress, seenLevel: action.level } }

    case 'profile/update':
      return { ...state, profile: { ...state.profile, ...action.patch } }

    case 'theme/unlock': {
      const merged = new Set([...state.profile.unlockedThemes, ...action.themes])
      if (merged.size === state.profile.unlockedThemes.length) return state
      return { ...state, profile: { ...state.profile, unlockedThemes: [...merged] } }
    }

    case 'state/replace':
      return action.state

    default:
      return state
  }
}

/* ---------------------------------------------------- action constructors */

export type EntryDraft = {
  amount: number
  vaultId?: string | null
  kind?: EntryKind
  date?: ISODate
  note?: string
}

export function makeEntry(draft: EntryDraft): Entry {
  return {
    id: newId('e_'),
    vaultId: draft.vaultId ?? null,
    amount: Math.abs(Math.round(draft.amount)),
    kind: draft.kind ?? 'deposit',
    date: draft.date ?? todayISO(),
    note: (draft.note ?? '').trim().slice(0, 200),
    createdAt: Date.now(),
  }
}

export const addEntry = (draft: EntryDraft): Action => ({ type: 'entry/add', entry: makeEntry(draft) })

/**
 * One move of money from the Bank into a vault, as a linked pair: out of the
 * Bank, into the vault. Booking it as a pair keeps the running total honest —
 * a distribution changes where money sits, never how much there is.
 */
export function makeTransfer(vaultId: string, amount: Cents, date: ISODate, note: string): Entry[] {
  const transferId = newId('t_')
  const at = Date.now()
  return [
    { id: newId('e_'), vaultId: null, amount, kind: 'withdrawal', date, note, createdAt: at, transferId },
    { id: newId('e_'), vaultId, amount, kind: 'deposit', date, note, createdAt: at + 1, transferId },
  ]
}
export const addVault = (draft: VaultDraft): Action => ({ type: 'vault/add', vault: makeVault(draft) })
