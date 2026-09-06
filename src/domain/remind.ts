import type { Cents, Entry, ISODate } from './types'
import { fromISO } from './dates'
import { isNewMoney } from './stats'

/**
 * A weekly reminder the phone delivers, not the app.
 *
 * Hoard has no server and nothing leaves the device, which rules out push:
 * that needs a push service holding device tokens. And the web has no way to
 * schedule a notification that fires while the page is closed — Notification
 * only works while the app is running, which is exactly when a reminder is
 * pointless. So the app writes a calendar event and the phone's own calendar
 * does the reminding. No account, no tokens, no network.
 *
 * The event carries a stable UID and a sequence number, which is how
 * iCalendar expresses "this is a new version of an event you already have".
 * Re-adding an updated file replaces the old event instead of stacking a
 * duplicate — that is what lets the reminder stay current as the vaults,
 * amounts and deadlines change underneath it.
 */

export type ReminderPlan = {
  /** What the vaults need across a week, summed. */
  weeklyNeed: Cents
  /** Which vaults that money is for, most urgent first. */
  forVaults: string[]
  /** ISO weekday, 1 = Monday … 7 = Sunday. */
  weekday: number
  title: string
  /** The body of the calendar event. */
  note: string
  /**
   * Changes exactly when the wording would change. Stored alongside the
   * exported event so the app can tell whether the copy in the calendar still
   * matches reality, without keeping a second copy of the text.
   */
  signature: string
}

export type ReminderState = {
  uid: string
  /** Bumped on every export; iCalendar uses it to order revisions. */
  sequence: number
  signature: string
  at: number
}

type VaultNeed = { name: string; requiredPerWeek: Cents | null; remaining: Cents }

const money = (cents: Cents) => {
  const units = cents / 100
  return units % 1 === 0 ? `$${units.toLocaleString()}` : `$${units.toFixed(2)}`
}

/**
 * The day of the week they actually save on.
 *
 * A reminder on a day someone never has money is a reminder they learn to
 * swipe away. Payday is the strongest habit most people have, so the busiest
 * weekday in their own history beats any default. Sunday is the fallback:
 * it is the last day of the ISO week, so it is the final chance to keep a
 * streak alive rather than an arbitrary pick.
 */
export function preferredWeekday(entries: Entry[]): number {
  const tally = new Map<number, number>()
  for (const e of entries) {
    if (!isNewMoney(e)) continue
    const day = fromISO(e.date).getUTCDay()
    const iso = day === 0 ? 7 : day
    tally.set(iso, (tally.get(iso) ?? 0) + 1)
  }
  if (tally.size === 0) return 7

  let best = 7
  let bestCount = -1
  for (const [day, count] of tally) {
    // Ties resolve to the later day, which leaves less of the week unused.
    if (count > bestCount || (count === bestCount && day > best)) {
      best = day
      bestCount = count
    }
  }
  return best
}

export function reminderPlan(
  vaults: VaultNeed[],
  entries: Entry[],
  monthlyRemaining: Cents,
): ReminderPlan {
  const needing = vaults
    .filter((v) => (v.requiredPerWeek ?? 0) > 0 && v.remaining > 0)
    .sort((a, b) => (b.requiredPerWeek ?? 0) - (a.requiredPerWeek ?? 0))

  const weeklyNeed = needing.reduce((sum, v) => sum + (v.requiredPerWeek ?? 0), 0)
  const forVaults = needing.map((v) => v.name)
  const weekday = preferredWeekday(entries)

  const title = weeklyNeed > 0 ? `Hoard — put ${money(weeklyNeed)} away` : 'Hoard — put something away'

  // The body names what the money is for. "Save money" is a reminder anyone
  // can ignore; "£59 into Christmas and Japan trip" is a decision already made.
  const named = forVaults.slice(0, 3)
  const rest = forVaults.length - named.length
  const list =
    named.length === 0
      ? ''
      : named.length === 1
        ? named[0]
        : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}${rest > 0 ? ` (+${rest} more)` : ''}`

  const lines: string[] = []
  if (weeklyNeed > 0 && list) {
    lines.push(`${money(weeklyNeed)} keeps ${list} on track this week.`)
  } else {
    lines.push('Log whatever you managed to put aside this week.')
  }
  if (monthlyRemaining > 0) lines.push(`${money(monthlyRemaining)} left on this month's goal.`)
  lines.push('Open Hoard to log it.')

  const note = lines.join('\n')
  const signature = [weeklyNeed, weekday, monthlyRemaining, ...forVaults].join('|')

  return { weeklyNeed, forVaults, weekday, title, note, signature }
}

/**
 * True when the event sitting in the calendar no longer says what the app
 * would say now. Nothing exported yet is not "stale" — there is nothing to
 * correct, and prompting to update an event that does not exist would be
 * noise.
 */
export function reminderStale(plan: ReminderPlan, state: ReminderState | null): boolean {
  return state != null && state.signature !== plan.signature
}

/** RFC 5545 wants CRLF, escaped separators, and lines folded at 75 octets. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = [line.slice(0, 75)]
  for (let i = 75; i < line.length; i += 74) out.push(` ${line.slice(i, i + 74)}`)
  return out.join('\r\n')
}

/**
 * Order matters: backslashes first, or the escapes added below get escaped
 * again. A real newline becomes the two-character \n that iCalendar wants.
 */
const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')

const stamp = (d: Date) => `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`

const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/**
 * A weekly, all-day, repeating event with an alarm on the morning of.
 *
 * All-day rather than timed because a savings reminder does not belong at a
 * particular minute, and an all-day event with a display alarm is what most
 * calendars surface as a notification rather than burying in a row.
 */
export function buildICS(
  plan: ReminderPlan,
  state: ReminderState,
  from: ISODate,
  now: Date = new Date(),
): string {
  // First occurrence: the next time the chosen weekday comes round.
  const start = fromISO(from)
  const today = start.getUTCDay() === 0 ? 7 : start.getUTCDay()
  const ahead = (plan.weekday - today + 7) % 7
  start.setUTCDate(start.getUTCDate() + ahead)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hoard//Weekly reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${state.uid}`,
    `SEQUENCE:${state.sequence}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${ymd(start)}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${ICS_DAYS[plan.weekday - 1]}`,
    `SUMMARY:${esc(plan.title)}`,
    `DESCRIPTION:${esc(plan.note)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(plan.title)}`,
    'TRIGGER:PT9H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n')
}

/** A UID has to be stable for the life of the reminder and unique to it. */
export function newReminderUid(now: Date = new Date(), rand = Math.random): string {
  return `hoard-${now.getTime().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}@hoard.local`
}

/** Human summary of when the reminder lands, for the panel that offers it. */
export const WEEKDAY_NAME = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAME[weekday - 1] ?? 'Sunday'
}
