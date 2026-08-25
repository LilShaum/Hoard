import type { Entry } from './types'

/**
 * Whether it is time to nag about a backup.
 *
 * Everything Hoard knows lives in this browser's localStorage. That is the
 * right call for an app with no account and no server — nothing to sign up
 * for, nothing to leak — but it has one sharp edge: clearing site data, or iOS
 * evicting storage from an app that has sat unused, takes the lot. Months of
 * saving history, gone, with no way back.
 *
 * Export and restore already exist. What did not exist was anything that ever
 * *told* someone to use them, which makes the safety net decorative. So this
 * decides when the risk is real enough to say something, and the copy built on
 * it states plainly what a wipe would actually cost.
 *
 * The bar is deliberately high, because a prompt that appears when there is
 * nothing to lose is a prompt people learn to dismiss.
 */

export type BackupStatus = {
  /** Worth prompting about right now. */
  due: boolean
  reason: 'never' | 'stale' | null
  /** Whole days since the last backup; null if there has never been one. */
  daysSince: number | null
  /** Entries logged since the last backup — exactly what a wipe would cost. */
  unsaved: number
  total: number
}

/** Below this there is not yet enough history to be worth protecting. */
export const MIN_ENTRIES = 8
/** A month between backups is plenty for something used a few times a week. */
export const STALE_DAYS = 30

const DAY = 86_400_000

export function backupStatus(
  entries: Entry[],
  lastBackupAt: number | null,
  now: number = Date.now(),
): BackupStatus {
  const total = entries.length
  // `createdAt` is when the row was logged, which is what a backup would have
  // captured — not `date`, which is when the money moved and can be backdated.
  const unsaved = lastBackupAt == null
    ? total
    : entries.filter((e) => e.createdAt > lastBackupAt).length
  const daysSince = lastBackupAt == null ? null : Math.max(0, Math.floor((now - lastBackupAt) / DAY))

  const quiet = { due: false, reason: null, daysSince, unsaved, total } as const

  // Nothing worth losing yet, or nothing has changed since the last backup.
  if (total < MIN_ENTRIES || unsaved === 0) return quiet
  if (lastBackupAt == null) return { due: true, reason: 'never', daysSince: null, unsaved, total }
  if ((daysSince ?? 0) >= STALE_DAYS) return { due: true, reason: 'stale', daysSince, unsaved, total }
  return quiet
}
