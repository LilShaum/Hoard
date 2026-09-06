import { describe, expect, it } from 'vitest'
import {
  buildICS,
  newReminderUid,
  preferredWeekday,
  reminderPlan,
  reminderStale,
  weekdayName,
} from '../remind'
import type { Entry } from '../types'

const entry = (date: string, over: Partial<Entry> = {}): Entry => ({
  id: `e-${date}-${Math.random()}`,
  vaultId: null,
  amount: 5_000,
  kind: 'deposit',
  date,
  note: '',
  createdAt: 1,
  ...over,
})

const vault = (name: string, requiredPerWeek: number | null, remaining = 100_000) =>
  ({ name, requiredPerWeek, remaining })

/** Pull one property out of the generated file, unfolding continuation lines. */
const prop = (ics: string, key: string): string | null => {
  const unfolded = ics.split('\r\n').reduce<string[]>((acc, line) => {
    if (line.startsWith(' ') && acc.length > 0) acc[acc.length - 1] += line.slice(1)
    else acc.push(line)
    return acc
  }, [])
  const hit = unfolded.find((l) => l.startsWith(`${key}:`) || l.startsWith(`${key};`))
  return hit ? hit.slice(hit.indexOf(':') + 1) : null
}

describe('preferred weekday', () => {
  it('falls back to Sunday with no history, the last chance in the week', () => {
    expect(preferredWeekday([])).toBe(7)
  })

  it('picks the day they actually save on', () => {
    // 2026-08-07 is a Friday, 2026-08-10 a Monday.
    const entries = [
      entry('2026-08-07'), entry('2026-08-14'), entry('2026-08-21'),
      entry('2026-08-10'),
    ]
    expect(preferredWeekday(entries)).toBe(5)
  })

  it('ignores spending and Bank transfers — only new money counts', () => {
    const entries = [
      entry('2026-08-07', { kind: 'spend' }),
      entry('2026-08-07', { kind: 'deposit', transferId: 'tx1' }),
      entry('2026-08-10'),
    ]
    expect(preferredWeekday(entries)).toBe(1)
  })
})

describe('the plan', () => {
  it('sums what the vaults need and names them, most urgent first', () => {
    const plan = reminderPlan(
      [vault('Christmas', 1_632), vault('Japan trip', 4_283)],
      [],
      0,
    )
    expect(plan.weeklyNeed).toBe(5_915)
    expect(plan.forVaults).toEqual(['Japan trip', 'Christmas'])
    expect(plan.title).toContain('$59.15')
    expect(plan.note).toContain('Japan trip and Christmas')
  })

  it('leaves out vaults that need nothing, or are already full', () => {
    const plan = reminderPlan(
      [vault('Done', 5_000, 0), vault('Untargeted', null), vault('Live', 2_000)],
      [],
      0,
    )
    expect(plan.forVaults).toEqual(['Live'])
    expect(plan.weeklyNeed).toBe(2_000)
  })

  it('still says something useful when no vault has a weekly figure', () => {
    const plan = reminderPlan([], [], 0)
    expect(plan.weeklyNeed).toBe(0)
    expect(plan.title).toMatch(/put something away/)
    expect(plan.note).toMatch(/whatever you managed/)
  })

  it('mentions the monthly goal only while there is one left to hit', () => {
    expect(reminderPlan([], [], 40_000).note).toContain('$400 left')
    expect(reminderPlan([], [], 0).note).not.toContain('left on this')
  })
})

describe('staleness', () => {
  const plan = reminderPlan([vault('Christmas', 1_632)], [], 0)

  it('is not stale when nothing has been exported — there is nothing to correct', () => {
    expect(reminderStale(plan, null)).toBe(false)
  })

  it('is not stale while the wording would be identical', () => {
    const state = { uid: 'u', sequence: 1, signature: plan.signature, at: 1 }
    expect(reminderStale(plan, state)).toBe(false)
  })

  it('goes stale as soon as the amount changes', () => {
    const state = { uid: 'u', sequence: 1, signature: plan.signature, at: 1 }
    const later = reminderPlan([vault('Christmas', 9_999)], [], 0)
    expect(reminderStale(later, state)).toBe(true)
  })

  it('goes stale when a vault is added, even at the same total', () => {
    const one = reminderPlan([vault('A', 2_000)], [], 0)
    const two = reminderPlan([vault('A', 1_000), vault('B', 1_000)], [], 0)
    expect(one.weeklyNeed).toBe(two.weeklyNeed)
    expect(reminderStale(two, { uid: 'u', sequence: 1, signature: one.signature, at: 1 }))
      .toBe(true)
  })
})

describe('the calendar file', () => {
  const plan = reminderPlan([vault('Christmas', 1_632), vault('Japan trip', 4_283)], [], 40_000)
  const state = { uid: 'uid-1@hoard.local', sequence: 3, signature: plan.signature, at: 1 }
  const ics = buildICS(plan, state, '2026-08-26', new Date('2026-08-26T10:00:00Z'))

  it('is a single well-formed event', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR')).toBe(true)
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(1)
    expect(ics.includes('\r\n')).toBe(true)
  })

  it('carries the uid and sequence, which is what updates rather than duplicates', () => {
    expect(prop(ics, 'UID')).toBe('uid-1@hoard.local')
    expect(prop(ics, 'SEQUENCE')).toBe('3')
  })

  it('repeats weekly on the chosen day, starting on the next such day', () => {
    // No history, so Sunday. 2026-08-26 is a Wednesday; the next Sunday is the 30th.
    expect(prop(ics, 'RRULE')).toBe('FREQ=WEEKLY;BYDAY=SU')
    expect(prop(ics, 'DTSTART')).toBe('20260830')
    expect(prop(ics, 'DTEND')).toBe('20260831')
  })

  it('starts today when today is already the chosen day', () => {
    // 2026-08-30 is itself a Sunday.
    const same = buildICS(plan, state, '2026-08-30', new Date('2026-08-30T10:00:00Z'))
    expect(prop(same, 'DTSTART')).toBe('20260830')
  })

  it('escapes the separators iCalendar reserves, and folds long lines', () => {
    const tricky = reminderPlan([vault('Books, films; etc', 1_000)], [], 0)
    const out = buildICS(tricky, state, '2026-08-26', new Date('2026-08-26T10:00:00Z'))
    expect(prop(out, 'DESCRIPTION')).toContain('Books\\, films\\; etc')
    // Newlines survive as the two-character escape, not a raw break.
    expect(prop(out, 'DESCRIPTION')).toContain('\\n')
    for (const line of out.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75)
  })

  it('gives every reminder its own uid', () => {
    const a = newReminderUid(new Date('2026-01-01'), () => 0.1)
    const b = newReminderUid(new Date('2026-01-01'), () => 0.9)
    expect(a).not.toBe(b)
    expect(a).toContain('@hoard.local')
  })
})

describe('weekday names', () => {
  it('names every day, and falls back rather than printing undefined', () => {
    expect(weekdayName(1)).toBe('Monday')
    expect(weekdayName(7)).toBe('Sunday')
    expect(weekdayName(0)).toBe('Sunday')
    expect(weekdayName(99)).toBe('Sunday')
  })
})
