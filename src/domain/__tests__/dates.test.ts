import { describe, expect, it } from 'vitest'
import {
  addDays, addMonths, daysBetween, daysLeftInMonth, eachDay, formatCountdown,
  formatRelativeDay, fromISO, isValidISO, isoWeekKey, monthEnd, monthKey,
  monthStart, toISO, weekEnd, weeksBetween, weekStart,
} from '../dates'

describe('parsing and formatting', () => {
  it('round-trips through local time, not UTC', () => {
    expect(toISO(fromISO('2026-03-01'))).toBe('2026-03-01')
    expect(fromISO('2026-03-01').getDate()).toBe(1)
    expect(fromISO('2026-03-01').getHours()).toBe(0)
  })

  it('validates shape and real calendar days', () => {
    expect(isValidISO('2026-02-28')).toBe(true)
    expect(isValidISO('2026-02-30')).toBe(false) // rolls to March, so not a real day
    expect(isValidISO('2026-13-01')).toBe(false)
    expect(isValidISO('26-01-01')).toBe(false)
    expect(isValidISO(20260101)).toBe(false)
  })
})

describe('day maths', () => {
  it('adds and subtracts across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('clamps month arithmetic instead of overflowing', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29') // leap year
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15')
  })

  it('counts whole days in both directions', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10)
    expect(daysBetween('2026-01-11', '2026-01-01')).toBe(-10)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
    // Across a spring-forward boundary in most northern-hemisphere zones.
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
  })

  it('handles leap years', () => {
    expect(daysBetween('2024-02-01', '2024-03-01')).toBe(29)
    expect(daysBetween('2026-02-01', '2026-03-01')).toBe(28)
  })
})

describe('ISO weeks', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-08-21')).toBe('2026-08-17') // a Friday -> its Monday
    expect(weekStart('2026-08-17')).toBe('2026-08-17')
    expect(weekEnd('2026-08-17')).toBe('2026-08-23')
  })

  it('treats Sunday as the end of the week, not the start', () => {
    expect(weekStart('2026-08-23')).toBe('2026-08-17')
  })

  it('uses the ISO year, which is not always the calendar year', () => {
    // 2021-01-01 was a Friday belonging to ISO week 53 of 2020.
    expect(isoWeekKey('2021-01-01')).toBe('2020-W53')
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01')
    // 2024-12-30 (Monday) opens ISO week 1 of 2025.
    expect(isoWeekKey('2024-12-30')).toBe('2025-W01')
  })

  it('gives every day of a week the same key', () => {
    const keys = eachDay('2026-08-17', '2026-08-23').map(isoWeekKey)
    expect(new Set(keys).size).toBe(1)
  })

  it('measures week distance', () => {
    expect(weeksBetween('2026-08-03', '2026-08-24')).toBe(3)
    expect(weeksBetween('2026-08-24', '2026-08-03')).toBe(-3)
  })
})

describe('months', () => {
  it('finds boundaries', () => {
    expect(monthKey('2026-08-21')).toBe('2026-08')
    expect(monthStart('2026-08-21')).toBe('2026-08-01')
    expect(monthEnd('2026-08-21')).toBe('2026-08-31')
    expect(monthEnd('2026-02-10')).toBe('2026-02-28')
    expect(monthEnd('2024-02-10')).toBe('2024-02-29')
  })

  it('counts days remaining', () => {
    expect(daysLeftInMonth('2026-08-31')).toBe(0)
    expect(daysLeftInMonth('2026-08-01')).toBe(30)
  })
})

describe('human labels', () => {
  it('describes days relative to today', () => {
    expect(formatRelativeDay('2026-08-21', '2026-08-21')).toBe('Today')
    expect(formatRelativeDay('2026-08-20', '2026-08-21')).toBe('Yesterday')
    expect(formatRelativeDay('2026-08-18', '2026-08-21')).toBe('3 days ago')
    expect(formatRelativeDay('2026-07-04', '2026-08-21')).toBe('4 Jul')
  })

  it('describes deadlines', () => {
    expect(formatCountdown('2026-08-21', '2026-08-21')).toBe('Due today')
    expect(formatCountdown('2026-08-22', '2026-08-21')).toBe('1 day left')
    expect(formatCountdown('2026-09-01', '2026-08-21')).toBe('11 days left')
    expect(formatCountdown('2026-08-19', '2026-08-21')).toBe('2 days past')
  })
})

describe('eachDay', () => {
  it('is inclusive on both ends', () => {
    expect(eachDay('2026-08-01', '2026-08-03')).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(eachDay('2026-08-01', '2026-08-01')).toEqual(['2026-08-01'])
  })
})
