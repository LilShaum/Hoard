import { describe, expect, it } from 'vitest'
import { backupStatus, MIN_ENTRIES, STALE_DAYS } from '../backup'
import { derive } from '../selectors'
import { entry, state } from './factory'
import { reducer } from '@/store/reducer'

const TODAY = '2026-08-21'
const NOW = Date.parse('2026-08-21T12:00:00Z')
const DAY = 86_400_000

/** `n` entries, each logged `agoDays` before NOW. */
const logged = (n: number, agoDays = 0) =>
  Array.from({ length: n }, (_, i) =>
    entry(TODAY, 1_000, { createdAt: NOW - agoDays * DAY + i }))

describe('when a backup is worth asking for', () => {
  it('says nothing to somebody with barely any history', () => {
    const s = backupStatus(logged(MIN_ENTRIES - 1), null, NOW)
    expect(s.due).toBe(false)
    expect(s.reason).toBe(null)
  })

  it('asks once there is real history and no backup has ever been taken', () => {
    const s = backupStatus(logged(MIN_ENTRIES), null, NOW)
    expect(s.due).toBe(true)
    expect(s.reason).toBe('never')
    expect(s.unsaved).toBe(MIN_ENTRIES) // all of it is at risk
    expect(s.daysSince).toBe(null)
  })

  it('stays quiet right after a backup', () => {
    const entries = logged(20, 5)
    const s = backupStatus(entries, NOW - 1 * DAY, NOW)
    expect(s.due).toBe(false)
    expect(s.unsaved).toBe(0)
    expect(s.daysSince).toBe(1)
  })

  it('stays quiet when the backup is old but nothing has changed since', () => {
    const entries = logged(20, 90) // everything predates the backup
    const s = backupStatus(entries, NOW - (STALE_DAYS + 10) * DAY, NOW)
    expect(s.due).toBe(false)
    expect(s.unsaved).toBe(0)
  })

  it('asks again once the backup is stale and there is new history to lose', () => {
    const old = logged(20, 90)
    const fresh = logged(3, 2)
    const s = backupStatus([...old, ...fresh], NOW - (STALE_DAYS + 1) * DAY, NOW)
    expect(s.due).toBe(true)
    expect(s.reason).toBe('stale')
    expect(s.unsaved).toBe(3) // only what came after the backup
    expect(s.total).toBe(23)
    expect(s.daysSince).toBe(STALE_DAYS + 1)
  })

  it('counts by when a row was logged, not the date the money moved', () => {
    // Backdated entry, logged today: a backup taken yesterday would have missed it.
    const backdated = entry('2026-01-05', 5_000, { createdAt: NOW })
    const s = backupStatus([...logged(10, 60), backdated], NOW - 1 * DAY, NOW)
    expect(s.unsaved).toBe(1)
  })
})

describe('the nudge clears itself', () => {
  it('goes away once a backup is recorded', () => {
    let s = state({ entries: logged(12) })
    expect(derive(s, TODAY).backup.due).toBe(true)

    s = reducer(s, { type: 'backup/done', at: Date.now() })
    expect(derive(s, TODAY).backup.due).toBe(false)
    expect(s.progress.lastBackupAt).not.toBe(null)
  })
})
