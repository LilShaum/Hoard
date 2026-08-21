import type { Cents, Entry, ISODate } from './types'
import {
  addDays, eachDay, formatMonthLabel, isoWeekKey, monthKey, todayISO, weekStart,
} from './dates'

/** Pure aggregations. Everything the charts and records need, nothing they don't. */

/**
 * The amount an entry moves the hoard by. Spending is money that left the
 * everyday account, not the hoard, so it signs to zero here — every balance in
 * the app routes through this function precisely so that stays true.
 */
export function signed(e: Entry): Cents {
  return e.kind === 'deposit' ? e.amount : e.kind === 'withdrawal' ? -e.amount : 0
}

export function netOf(entries: Entry[]): Cents {
  let n = 0
  for (const e of entries) n += signed(e)
  return n
}

export function depositsOf(entries: Entry[]): Cents {
  let n = 0
  for (const e of entries) if (e.kind === 'deposit') n += e.amount
  return n
}

export function withdrawalsOf(entries: Entry[]): Cents {
  let n = 0
  for (const e of entries) if (e.kind === 'withdrawal') n += e.amount
  return n
}

export function spendOf(entries: Entry[]): Cents {
  let n = 0
  for (const e of entries) if (e.kind === 'spend') n += e.amount
  return n
}

export function groupNet(entries: Entry[], key: (e: Entry) => string): Map<string, Cents> {
  const m = new Map<string, Cents>()
  for (const e of entries) {
    const k = key(e)
    m.set(k, (m.get(k) ?? 0) + signed(e))
  }
  return m
}

export const byDay = (entries: Entry[]) => groupNet(entries, (e) => e.date)
export const byWeek = (entries: Entry[]) => groupNet(entries, (e) => isoWeekKey(e.date))
export const byMonth = (entries: Entry[]) => groupNet(entries, (e) => monthKey(e.date))

/* ------------------------------------------------------------------ series */

export type Point = { key: string; label: string; value: Cents }

/** Running total, one point per day, from the first entry (or `from`) to today. */
export function cumulativeSeries(
  entries: Entry[],
  today: ISODate = todayISO(),
  maxPoints = 180,
): Point[] {
  if (entries.length === 0) return []
  const daily = byDay(entries)
  const first = entries.reduce((a, e) => (e.date < a ? e.date : a), entries[0].date)
  const days = eachDay(first, today > first ? today : first)

  let running = 0
  const all: Point[] = days.map((d) => {
    running += daily.get(d) ?? 0
    return { key: d, label: d, value: running }
  })

  if (all.length <= maxPoints) return all
  // Downsample by stride, always keeping the final point so the line ends true.
  const stride = Math.ceil(all.length / maxPoints)
  const out = all.filter((_, i) => i % stride === 0)
  if (out[out.length - 1] !== all[all.length - 1]) out.push(all[all.length - 1])
  return out
}

/** Net per month for the last `count` months, oldest first, zero-filled. */
export function monthlySeries(entries: Entry[], count = 6, today: ISODate = todayISO()): Point[] {
  const m = byMonth(entries)
  const out: Point[] = []
  const [y, mo] = today.split('-').map(Number)
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, mo - 1 - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ key, label: formatMonthLabel(key), value: m.get(key) ?? 0 })
  }
  return out
}

/** Net per week for the last `count` ISO weeks, oldest first, zero-filled. */
export function weeklySeries(entries: Entry[], count = 12, today: ISODate = todayISO()): Point[] {
  const m = byWeek(entries)
  const out: Point[] = []
  for (let i = count - 1; i >= 0; i--) {
    const start = addDays(weekStart(today), -7 * i)
    const key = isoWeekKey(start)
    out.push({ key, label: key, value: m.get(key) ?? 0 })
  }
  return out
}

/* ---------------------------------------------------------------- heatmap */

export type HeatCell = { date: ISODate; value: Cents; level: 0 | 1 | 2 | 3 | 4 }

/**
 * A contribution grid, `weeks` columns of 7 days ending on the current week's
 * Sunday. Intensity buckets are quantile-ish against the user's own deposits,
 * so a $20-a-week saver gets the same satisfying spread as a $2,000 one.
 */
export function heatmap(entries: Entry[], weeks = 26, today: ISODate = todayISO()): HeatCell[][] {
  const daily = byDay(entries.filter((e) => e.kind === 'deposit'))
  const start = addDays(weekStart(today), -7 * (weeks - 1))

  const values = [...daily.values()].filter((v) => v > 0).sort((a, b) => a - b)
  const q = (p: number) => (values.length ? values[Math.min(values.length - 1, Math.floor(values.length * p))] : 0)
  const t1 = q(0.25), t2 = q(0.5), t3 = q(0.8)

  const cols: HeatCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d)
      const value = Math.max(0, daily.get(date) ?? 0)
      const level: HeatCell['level'] =
        value <= 0 ? 0 : value <= t1 ? 1 : value <= t2 ? 2 : value <= t3 ? 3 : 4
      col.push({ date, value, level })
    }
    cols.push(col)
  }
  return cols
}

/* ---------------------------------------------------------------- records */

export type Records = {
  bestDay: { key: string; value: Cents } | null
  bestWeek: { key: string; value: Cents } | null
  bestMonth: { key: string; value: Cents } | null
  biggestSingle: Entry | null
  totalDeposits: number
  averageDeposit: Cents
  medianWeek: Cents
  firstEntry: ISODate | null
}

function best(m: Map<string, Cents>): { key: string; value: Cents } | null {
  let out: { key: string; value: Cents } | null = null
  for (const [key, value] of m) if (value > 0 && (!out || value > out.value)) out = { key, value }
  return out
}

export function records(entries: Entry[]): Records {
  const deposits = entries.filter((e) => e.kind === 'deposit')
  const weekVals = [...byWeek(entries).values()].filter((v) => v > 0).sort((a, b) => a - b)
  const total = depositsOf(deposits)

  return {
    bestDay: best(byDay(entries)),
    bestWeek: best(byWeek(entries)),
    bestMonth: best(byMonth(entries)),
    biggestSingle: deposits.reduce<Entry | null>(
      (a, e) => (!a || e.amount > a.amount ? e : a), null),
    totalDeposits: deposits.length,
    averageDeposit: deposits.length ? Math.round(total / deposits.length) : 0,
    medianWeek: weekVals.length ? weekVals[Math.floor(weekVals.length / 2)] : 0,
    firstEntry: entries.length ? entries.reduce((a, e) => (e.date < a ? e.date : a), entries[0].date) : null,
  }
}

/** Distinct calendar days that saw a deposit. */
export function depositDays(entries: Entry[]): ISODate[] {
  const s = new Set<ISODate>()
  for (const e of entries) if (e.kind === 'deposit') s.add(e.date)
  return [...s].sort()
}
