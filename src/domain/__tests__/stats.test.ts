import { describe, expect, it } from 'vitest'
import {
  byMonth, byWeek, cumulativeSeries, depositDays, heatmap, monthlySeries,
  netOf, records, weeklySeries,
} from '../stats'
import { entry, weeklyDeposits } from './factory'

const TODAY = '2026-08-21'

describe('aggregation', () => {
  const entries = [
    entry('2026-07-15', 10_000),
    entry('2026-08-03', 20_000),
    entry('2026-08-19', 5_000, { kind: 'withdrawal' }),
  ]

  it('nets by month', () => {
    const m = byMonth(entries)
    expect(m.get('2026-07')).toBe(10_000)
    expect(m.get('2026-08')).toBe(15_000)
  })

  it('nets by ISO week', () => {
    expect(byWeek(entries).get('2026-W34')).toBe(-5_000)
  })

  it('nets overall', () => {
    expect(netOf(entries)).toBe(25_000)
  })

  it('collects distinct deposit days only', () => {
    expect(depositDays(entries)).toEqual(['2026-07-15', '2026-08-03'])
  })
})

describe('series', () => {
  it('builds a running total that only ever reflects real movement', () => {
    const s = cumulativeSeries([entry('2026-08-19', 10_000), entry('2026-08-21', 5_000)], TODAY)
    expect(s[0].value).toBe(10_000)
    expect(s[s.length - 1].value).toBe(15_000)
    expect(s).toHaveLength(3) // 19th, 20th, 21st
  })

  it('is empty with no entries', () => {
    expect(cumulativeSeries([], TODAY)).toEqual([])
  })

  it('downsamples long histories but keeps the true final value', () => {
    const long = weeklyDeposits(TODAY, 200, 1_000)
    const s = cumulativeSeries(long, TODAY, 60)
    expect(s.length).toBeLessThanOrEqual(61)
    expect(s[s.length - 1].value).toBe(200_000)
  })

  it('zero-fills months with no activity', () => {
    const s = monthlySeries([entry('2026-08-01', 10_000)], 3, TODAY)
    expect(s.map((p) => p.key)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(s.map((p) => p.value)).toEqual([0, 0, 10_000])
  })

  it('zero-fills weeks and ends on the current one', () => {
    const s = weeklySeries([entry(TODAY, 3_000)], 4, TODAY)
    expect(s).toHaveLength(4)
    expect(s[3].key).toBe('2026-W34')
    expect(s[3].value).toBe(3_000)
    expect(s[0].value).toBe(0)
  })
})

describe('heatmap', () => {
  it('is a grid of whole weeks ending on the current week', () => {
    const grid = heatmap([entry(TODAY, 5_000)], 26, TODAY)
    expect(grid).toHaveLength(26)
    expect(grid.every((col) => col.length === 7)).toBe(true)
    expect(grid[25][4].date).toBe(TODAY) // Friday of the last column
  })

  it('marks empty days as level zero', () => {
    const grid = heatmap([], 4, TODAY)
    expect(grid.flat().every((c) => c.level === 0)).toBe(true)
  })

  it('scales intensity to the user, not to a fixed amount', () => {
    const small = heatmap([entry('2026-08-17', 100), entry('2026-08-18', 5_000)], 4, TODAY)
    const large = heatmap([entry('2026-08-17', 10_000), entry('2026-08-18', 500_000)], 4, TODAY)
    const levels = (g: ReturnType<typeof heatmap>) =>
      g.flat().filter((c) => c.value > 0).map((c) => c.level)
    expect(levels(small)).toEqual(levels(large))
  })

  it('ignores withdrawals', () => {
    const grid = heatmap([entry(TODAY, 5_000, { kind: 'withdrawal' })], 4, TODAY)
    expect(grid.flat().every((c) => c.level === 0)).toBe(true)
  })
})

describe('records', () => {
  it('finds bests across every window', () => {
    const r = records([
      entry('2026-06-01', 5_000),
      entry('2026-08-03', 30_000),
      entry('2026-08-04', 1_000),
    ])
    expect(r.bestDay!.value).toBe(30_000)
    expect(r.bestWeek!.value).toBe(31_000)
    expect(r.bestMonth!.key).toBe('2026-08')
    expect(r.biggestSingle!.amount).toBe(30_000)
    expect(r.totalDeposits).toBe(3)
    expect(r.averageDeposit).toBe(12_000)
    expect(r.firstEntry).toBe('2026-06-01')
  })

  it('returns nulls rather than NaN when there is nothing to rank', () => {
    const r = records([])
    expect(r.bestDay).toBeNull()
    expect(r.biggestSingle).toBeNull()
    expect(r.averageDeposit).toBe(0)
    expect(r.firstEntry).toBeNull()
  })

  it('never picks a negative week as a personal best', () => {
    const r = records([entry(TODAY, 5_000, { kind: 'withdrawal' })])
    expect(r.bestWeek).toBeNull()
  })
})
