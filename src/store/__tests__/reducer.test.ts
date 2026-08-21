import { describe, expect, it } from 'vitest'
import { addEntry, addVault, makeEntry, reducer } from '../reducer'
import { initialState } from '../defaults'
import { derive } from '@/domain/selectors'
import type { State } from '@/domain/types'

const start = (): State => initialState()
const TODAY = '2026-08-21'

describe('entries', () => {
  it('adds and removes', () => {
    let s = reducer(start(), addEntry({ amount: 5_000, date: TODAY }))
    expect(s.entries).toHaveLength(1)
    s = reducer(s, { type: 'entry/delete', id: s.entries[0].id })
    expect(s.entries).toHaveLength(0)
  })

  it('stores a positive amount even when handed a negative one', () => {
    const e = makeEntry({ amount: -5_000, kind: 'withdrawal' })
    expect(e.amount).toBe(5_000)
    expect(e.kind).toBe('withdrawal')
  })

  it('gives every entry a distinct id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => makeEntry({ amount: 100 }).id))
    expect(ids.size).toBe(200)
  })

  it('trims and caps notes', () => {
    expect(makeEntry({ amount: 100, note: '  hello  ' }).note).toBe('hello')
    expect(makeEntry({ amount: 100, note: 'x'.repeat(400) }).note.length).toBe(200)
  })
})

describe('vaults', () => {
  it('moves money to the general hoard when a vault is deleted, never destroying it', () => {
    let s = reducer(start(), addVault({ name: 'Trip', emoji: '✈️', target: 100_000, deadline: null, color: 'azure' }))
    const id = s.vaults[0].id
    s = reducer(s, addEntry({ amount: 30_000, vaultId: id, date: TODAY }))
    const before = derive(s, TODAY).totalSaved

    s = reducer(s, { type: 'vault/delete', id })
    const after = derive(s, TODAY)

    expect(s.vaults).toHaveLength(0)
    expect(after.totalSaved).toBe(before)
    expect(after.generalSaved).toBe(30_000)
  })

  it('patches without clobbering untouched fields', () => {
    let s = reducer(start(), addVault({ name: 'Trip', emoji: '✈️', target: 100_000, deadline: null, color: 'azure' }))
    const id = s.vaults[0].id
    s = reducer(s, { type: 'vault/update', id, patch: { name: 'Japan' } })
    expect(s.vaults[0].name).toBe('Japan')
    expect(s.vaults[0].target).toBe(100_000)
    expect(s.vaults[0].emoji).toBe('✈️')
  })

  it('celebrates a vault only once', () => {
    let s = reducer(start(), { type: 'vault/celebrated', id: 'v1' })
    const first = s
    s = reducer(s, { type: 'vault/celebrated', id: 'v1' })
    expect(s).toBe(first) // identity preserved, so React skips the re-render
  })
})

describe('progress', () => {
  it('claims a quest once', () => {
    let s = reducer(start(), { type: 'quest/claim', id: 'q1', date: TODAY })
    const first = s
    s = reducer(s, { type: 'quest/claim', id: 'q1', date: '2026-08-22' })
    expect(s).toBe(first)
    expect(s.progress.claimedQuests.q1).toBe(TODAY)
  })

  it('records only achievements it has not seen', () => {
    let s = reducer(start(), { type: 'achievements/record', ids: ['a', 'b'], date: TODAY })
    const first = s
    s = reducer(s, { type: 'achievements/record', ids: ['a'], date: '2026-08-22' })
    expect(s).toBe(first)
    expect(s.progress.unlockedAchievements.a).toBe(TODAY)
  })

  it('never lowers the seen level', () => {
    let s = reducer(start(), { type: 'level/seen', level: 9 })
    s = reducer(s, { type: 'level/seen', level: 4 })
    expect(s.progress.seenLevel).toBe(9)
  })

  it('merges theme unlocks without duplicating', () => {
    let s = reducer(start(), { type: 'theme/unlock', themes: ['verdant', 'royal'] })
    s = reducer(s, { type: 'theme/unlock', themes: ['royal'] })
    expect(s.profile.unlockedThemes).toEqual(['midnight', 'verdant', 'royal'])
  })
})

describe('immutability', () => {
  it('never mutates the state it was given', () => {
    const s = start()
    const snapshot = JSON.stringify(s)
    reducer(s, addEntry({ amount: 1_000, date: TODAY }))
    reducer(s, addVault({ name: 'X', emoji: '🎯', target: 1, deadline: null, color: 'gold' }))
    reducer(s, { type: 'profile/update', patch: { name: 'Changed' } })
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('returns the identical object for a no-op, so subscribers do not re-render', () => {
    const s = start()
    expect(reducer(s, { type: 'level/seen', level: 1 })).toBe(s)
  })
})
