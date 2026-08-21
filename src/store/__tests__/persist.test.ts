import { describe, expect, it } from 'vitest'
import { exportState, importState, migrate, sanitise } from '../persist'
import { initialState, SCHEMA_VERSION } from '../defaults'
import { reducer, addEntry, addVault } from '../reducer'
import type { State } from '@/domain/types'

const base = (): State => ({
  ...initialState(),
  profile: { ...initialState().profile, name: 'Sam', monthlyTarget: 40_000, onboarded: true },
})

describe('sanitise', () => {
  it('returns a usable state from complete rubbish', () => {
    for (const junk of [null, undefined, 42, 'nope', [], { vaults: 'no' }]) {
      const s = sanitise(junk)
      expect(Array.isArray(s.vaults)).toBe(true)
      expect(Array.isArray(s.entries)).toBe(true)
      expect(s.version).toBe(SCHEMA_VERSION)
    }
  })

  it('drops entries with no id or no amount instead of rendering NaN later', () => {
    const s = sanitise({
      entries: [
        { id: 'a', amount: 500, date: '2026-08-01', kind: 'deposit' },
        { amount: 500, date: '2026-08-01' },
        { id: 'c', amount: 0, date: '2026-08-01' },
        { id: 'd', amount: 'lots', date: '2026-08-01' },
      ],
    })
    expect(s.entries.map((e) => e.id)).toEqual(['a'])
  })

  it('forces amounts positive and lets `kind` carry the sign', () => {
    const s = sanitise({ entries: [{ id: 'a', amount: -500, kind: 'withdrawal', date: '2026-08-01' }] })
    expect(s.entries[0].amount).toBe(500)
    expect(s.entries[0].kind).toBe('withdrawal')
  })

  it('rounds fractional cents that should never have existed', () => {
    const s = sanitise({ entries: [{ id: 'a', amount: 500.7, date: '2026-08-01' }] })
    expect(s.entries[0].amount).toBe(501)
  })

  it('repairs impossible dates rather than dropping the money', () => {
    const s = sanitise({ entries: [{ id: 'a', amount: 500, date: '2026-02-31' }] })
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('deduplicates by id, so importing the same file twice cannot double a balance', () => {
    const dup = { id: 'a', amount: 500, date: '2026-08-01', kind: 'deposit' }
    const s = sanitise({ entries: [dup, { ...dup }, { ...dup }] })
    expect(s.entries).toHaveLength(1)
  })

  it('rejects a currency that is not an ISO code', () => {
    expect(sanitise({ profile: { currency: 'dollars' } }).profile.currency).toMatch(/^[A-Z]{3}$/)
    expect(sanitise({ profile: { currency: 'GBP' } }).profile.currency).toBe('GBP')
  })

  it('clamps a negative monthly target to zero', () => {
    expect(sanitise({ profile: { monthlyTarget: -900 } }).profile.monthlyTarget).toBe(0)
  })

  it('truncates absurdly long strings', () => {
    const s = sanitise({ vaults: [{ id: 'v', name: 'x'.repeat(5_000) }] })
    expect(s.vaults[0].name.length).toBeLessThanOrEqual(80)
  })

  it('turns a zero or negative vault target into an open vault', () => {
    expect(sanitise({ vaults: [{ id: 'v', target: 0 }] }).vaults[0].target).toBeNull()
    expect(sanitise({ vaults: [{ id: 'v', target: -100 }] }).vaults[0].target).toBeNull()
  })

  it('keeps only string values in the progress records', () => {
    const s = sanitise({ progress: { claimedQuests: { good: '2026-08-01', bad: 42, worse: null } } })
    expect(Object.keys(s.progress.claimedQuests)).toEqual(['good'])
  })
})

describe('migrate', () => {
  it('stamps the current version onto an unversioned blob', () => {
    expect(migrate({ entries: [] }).version).toBe(SCHEMA_VERSION)
  })

  it('leaves current-version data alone', () => {
    const s = base()
    expect(migrate(s)).toEqual({ ...s, version: SCHEMA_VERSION })
  })

  it('does not loop forever when a step is missing', () => {
    expect(() => migrate({ version: -5 })).not.toThrow()
    expect(() => migrate({ version: 999 })).not.toThrow()
  })
})

describe('export and import', () => {
  it('round-trips losslessly', () => {
    let s = base()
    s = reducer(s, addVault({ name: 'Christmas', glyph: 'gift', type: 'flare', target: 50_000, deadline: '2026-12-20' }))
    s = reducer(s, addEntry({ amount: 2_500, vaultId: s.vaults[0].id, date: '2026-08-01', note: 'Payday' }))
    s = reducer(s, { type: 'quest/claim', id: '2026-W34:weekly:days', date: '2026-08-21' })

    const restored = importState(exportState(s))
    expect(restored).not.toBeNull()
    expect(restored!.entries).toEqual(s.entries)
    expect(restored!.vaults).toEqual(s.vaults)
    expect(restored!.profile.name).toBe('Sam')
    expect(restored!.progress.claimedQuests).toEqual(s.progress.claimedQuests)
  })

  it('refuses a file that is not a Hoard backup', () => {
    expect(importState('not json at all')).toBeNull()
    expect(importState('{"hello":"world"}')).toBeNull()
    expect(importState('[]')).toBeNull()
    expect(importState('null')).toBeNull()
  })

  it('accepts a backup that has vaults but no entries yet', () => {
    expect(importState(JSON.stringify({ vaults: [], entries: [] }))).not.toBeNull()
  })
})
