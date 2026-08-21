import type { ISODate } from './types'

/**
 * All date maths here is **local-calendar** maths. We deliberately never round-trip
 * through UTC: a deposit logged at 11pm on the 3rd belongs to the 3rd, wherever
 * you are. Dates are carried as 'YYYY-MM-DD' strings and only become `Date`
 * objects inside this module.
 */

const DAY_MS = 86_400_000

export function toISO(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses 'YYYY-MM-DD' to local midnight (not UTC midnight). */
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now)
}

export function isValidISO(iso: unknown): iso is ISODate {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = fromISO(iso)
  return !Number.isNaN(d.getTime()) && toISO(d) === iso
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addMonths(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  const targetDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  // Clamp: adding a month to Jan 31 gives Feb 28/29, not Mar 3.
  d.setDate(Math.min(targetDay, daysInMonth(d.getFullYear(), d.getMonth())))
  return toISO(d)
}

/** Whole days from `a` to `b`. Positive when `b` is later. DST-safe. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const da = fromISO(a)
  const db = fromISO(b)
  // Normalise to UTC noon so a DST shift can't knock us to the wrong day.
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate(), 12)
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate(), 12)
  return Math.round((ub - ua) / DAY_MS)
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function clampISO(iso: ISODate, min: ISODate, max: ISODate): ISODate {
  return iso < min ? min : iso > max ? max : iso
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/* ------------------------------------------------------------------ weeks */

/** Monday of the ISO week containing `iso`. */
export function weekStart(iso: ISODate): ISODate {
  const d = fromISO(iso)
  const dow = (d.getDay() + 6) % 7 // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export function weekEnd(iso: ISODate): ISODate {
  return addDays(weekStart(iso), 6)
}

/**
 * ISO-8601 week key, 'YYYY-Www'. The year is the *ISO* year, which is why
 * 2021-01-01 is 2020-W53 — a fact that quietly breaks naive streak code.
 */
export function isoWeekKey(iso: ISODate): string {
  const d = fromISO(iso)
  // Shift to the Thursday of this week; its calendar year is the ISO year.
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow + 3)
  const isoYear = d.getFullYear()
  const firstThursday = new Date(isoYear, 0, 4)
  const ftDow = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - ftDow + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * DAY_MS))
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

/** Whole weeks from the week of `a` to the week of `b`. */
export function weeksBetween(a: ISODate, b: ISODate): number {
  return Math.round(daysBetween(weekStart(a), weekStart(b)) / 7)
}

/* ----------------------------------------------------------------- months */

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}

export function monthStart(iso: ISODate): ISODate {
  return `${iso.slice(0, 7)}-01`
}

export function monthEnd(iso: ISODate): ISODate {
  const d = fromISO(iso)
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function daysLeftInMonth(iso: ISODate): number {
  return daysBetween(iso, monthEnd(iso))
}

/* -------------------------------------------------------------- formatting */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatShort(iso: ISODate): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatMedium(iso: ISODate): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatWeekday(iso: ISODate): string {
  return DOW[fromISO(iso).getDay()]
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS[(m ?? 1) - 1]} ${y}`
}

/** 'Today' / 'Yesterday' / '3 Sep' — for activity feeds. */
export function formatRelativeDay(iso: ISODate, today: ISODate = todayISO()): string {
  const diff = daysBetween(iso, today)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  return formatShort(iso)
}

/** '12 days left' / 'Due today' / '3 days late'. */
export function formatCountdown(deadline: ISODate, today: ISODate = todayISO()): string {
  const d = daysBetween(today, deadline)
  if (d === 0) return 'Due today'
  if (d === 1) return '1 day left'
  if (d > 1) return `${d} days left`
  if (d === -1) return '1 day past'
  return `${Math.abs(d)} days past`
}

/** Inclusive list of every day from `from` to `to`. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 20_000) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** '1 day' / '3 days'. Small, but "1 days left" reads as a bug to a user. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${Math.abs(n) === 1 ? one : many}`
}
