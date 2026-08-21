import { useId } from 'react'
import type { Point, HeatCell } from '@/domain/stats'
import type { Cents, ISODate } from '@/domain/types'
import { formatMonthLabel, formatShort, formatWeekday } from '@/domain/dates'
import { linear, niceMax } from './scale'
import { Figure, useHovered } from './Figure'

/**
 * Every chart here follows the same rules: thin marks, a solid hairline
 * baseline (dashes are reserved for a threshold or a forecast, never a grid),
 * selective direct labelling rather than a number on every point, a hover
 * tooltip that keyboard focus reproduces exactly, and a table twin behind the
 * Figure wrapper.
 */


/* ============================================================== week spark */

/** The current week's spending, one bar a day, against the per-day allowance. */
export function WeekSpark({ perDay, limit, money }: {
  perDay: Array<{ date: ISODate; value: Cents }>
  limit: Cents
  money: (c: number) => string
}) {
  const perDayCap = limit / 7
  const max = Math.max(perDayCap * 1.6, ...perDay.map((d) => d.value), 1)
  const { hovered, show, clear } = useHovered<{ date: ISODate; value: Cents }>()

  return (
    <div className="spark" onPointerLeave={clear}>
      <div className="spark__row">
        {perDay.map((d, i) => (
          <button
            key={d.date}
            className="spark__col"
            onPointerEnter={() => show(i, d)}
            onFocus={() => show(i, d)}
            onBlur={clear}
            aria-label={`${formatWeekday(d.date)}: ${money(d.value)} spent`}
          >
            <span className="spark__track">
              <span
                className="spark__bar"
                style={{ height: `${Math.max(d.value > 0 ? 6 : 0, (d.value / max) * 100)}%` }}
              />
            </span>
            <span className="spark__day">{formatWeekday(d.date).slice(0, 1)}</span>
          </button>
        ))}
        {/* The per-day allowance, drawn as a threshold. */}
        <span className="spark__cap" style={{ bottom: `${(perDayCap / max) * 100}%` }} aria-hidden />
      </div>
      <p className="tiny faint spark__note">
        {hovered
          ? <>{formatWeekday(hovered.datum.date)} · <span className="num">{money(hovered.datum.value)}</span></>
          : <>Dashed line: <span className="num">{money(Math.round(perDayCap))}</span> a day</>}
      </p>
    </div>
  )
}

/* ============================================================== area chart */

const AW = 320
const AH = 120

export function SavingsArea({ points, money, total }: {
  points: Point[]; money: (c: number) => string; total: Cents
}) {
  const id = useId()
  const { hovered, show, clear } = useHovered<Point>()

  if (points.length < 2) return null

  const max = niceMax(Math.max(...points.map((p) => p.value), 1))
  const x = linear(0, points.length - 1, 6, AW - 6)
  const y = linear(0, max, AH - 18, 10)
  const coords = points.map((p, i) => [x(i), y(Math.max(0, p.value))] as const)
  const line = coords.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${y(0)} L${coords[0][0].toFixed(1)},${y(0)} Z`
  const active = hovered ? coords[hovered.index] : null

  const step = Math.max(1, Math.floor(points.length / 12))

  return (
    <Figure
      title="Total saved"
      meta={<span className="num tiny">{money(total)}</span>}
      table={{
        columns: ['Date', 'Running total'],
        rows: points.filter((_, i) => i % step === 0 || i === points.length - 1)
          .map((p) => [formatShort(p.key), money(p.value)]),
      }}
    >
      <div className="chart" onPointerLeave={clear}>
        <svg viewBox={`0 0 ${AW} ${AH}`} className="chart__svg" role="img"
             aria-label={`Total saved over time, ending at ${money(total)}`}>
          <defs>
            <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <line x1="6" y1={y(max)} x2={AW - 6} y2={y(max)} stroke="var(--rule-soft)" strokeWidth="1" />
          <line x1="6" y1={y(0)} x2={AW - 6} y2={y(0)} stroke="var(--rule-soft)" strokeWidth="1" />
          <text x="6" y={y(max) - 4} className="chart__tick">{money(max)}</text>

          <path d={area} fill={`url(#${id}-f)`} />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />

          {active && (
            <>
              <line x1={active[0]} y1={10} x2={active[0]} y2={y(0)} stroke="var(--ink-3)" strokeWidth="1" />
              <circle cx={active[0]} cy={active[1]} r="4" fill="var(--accent)"
                      stroke="var(--panel)" strokeWidth="2" />
            </>
          )}

          {/* The endpoint is the only point worth labelling directly. */}
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="3.5"
                  fill="var(--accent)" stroke="var(--panel)" strokeWidth="2" />

          {/* One hit area per point, comfortably wider than the mark. */}
          {points.map((p, i) => (
            <rect
              key={p.key}
              x={x(i) - (AW / points.length) / 2}
              y={0}
              width={AW / points.length}
              height={AH}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${formatShort(p.key)}: ${money(p.value)}`}
              onPointerEnter={() => show(i, p)}
              onFocus={() => show(i, p)}
              onBlur={clear}
            />
          ))}
        </svg>
        <p className="chart__read tiny faint">
          {hovered
            ? <>{formatShort(hovered.datum.key)} · <span className="num">{money(hovered.datum.value)}</span></>
            : <>{formatShort(points[0].key)} to today</>}
        </p>
      </div>
    </Figure>
  )
}

/* =============================================================== bar chart */

const BW = 320
const BH = 128

export function MonthlyBars({ points, money, target }: {
  points: Point[]; money: (c: number) => string; target?: number
}) {
  const { hovered, show, clear } = useHovered<Point>()
  if (points.length === 0) return null

  const max = niceMax(Math.max(...points.map((p) => p.value), target ?? 0, 1))
  const y = linear(0, max, BH - 22, 12)
  const slot = (BW - 12) / points.length
  const barW = Math.min(26, slot - 6) // the gap between bars is the 2px+ surface rule

  return (
    <Figure
      title="Saved each month"
      meta={target ? <span className="num tiny faint">goal {money(target)}</span> : undefined}
      legend={target
        ? [
            { label: 'Saved', color: 'var(--accent)' },
            { label: 'Monthly goal', color: 'var(--ink-3)', dashed: true },
          ]
        : undefined}
      table={{
        columns: ['Month', 'Saved', ...(target ? ['Goal met'] : [])],
        rows: points.map((p) => [
          formatMonthLabel(p.key),
          money(p.value),
          ...(target ? [p.value >= target ? 'Yes' : 'No'] : []),
        ]),
      }}
    >
      <div className="chart" onPointerLeave={clear}>
        <svg viewBox={`0 0 ${BW} ${BH}`} className="chart__svg" role="img"
             aria-label={`Saved each month: ${points.map((p) => `${formatMonthLabel(p.key)} ${money(p.value)}`).join(', ')}`}>
          <line x1="6" y1={y(0)} x2={BW - 6} y2={y(0)} stroke="var(--rule-soft)" strokeWidth="1" />

          {target != null && target > 0 && (
            <line x1="6" y1={y(target)} x2={BW - 6} y2={y(target)}
                  stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="4 4" />
          )}

          {points.map((p, i) => {
            const cx = 6 + slot * i + slot / 2
            const value = Math.max(0, p.value)
            const top = y(value)
            const h = Math.max(value > 0 ? 2 : 0, y(0) - top)
            const met = target != null && target > 0 && value >= target
            const isHot = hovered?.index === i
            return (
              <g key={p.key}>
                <rect
                  x={cx - barW / 2} y={top} width={barW} height={h} rx="2"
                  fill={met ? 'var(--good)' : 'var(--accent)'}
                  opacity={hovered && !isHot ? 0.55 : 1}
                />
                <text x={cx} y={BH - 6} textAnchor="middle" className="chart__tick">
                  {formatMonthLabel(p.key).slice(0, 3)}
                </text>
                <rect
                  x={cx - slot / 2} y={0} width={slot} height={BH} fill="transparent"
                  tabIndex={0} role="button"
                  aria-label={`${formatMonthLabel(p.key)}: ${money(value)}${met ? ', goal met' : ''}`}
                  onPointerEnter={() => show(i, p)}
                  onFocus={() => show(i, p)}
                  onBlur={clear}
                />
              </g>
            )
          })}
        </svg>
        <p className="chart__read tiny faint">
          {hovered
            ? <>{formatMonthLabel(hovered.datum.key)} · <span className="num">{money(hovered.datum.value)}</span></>
            : <>Last {points.length} months</>}
        </p>
      </div>
    </Figure>
  )
}

/* ========================================================= weekly spending */

export function SpendBars({ weeks, limit, money }: {
  weeks: Array<{ key: string; start: ISODate; value: Cents }>
  limit: Cents
  money: (c: number) => string
}) {
  const { hovered, show, clear } = useHovered<{ key: string; start: ISODate; value: Cents }>()
  if (weeks.length === 0) return null

  const max = niceMax(Math.max(...weeks.map((w) => w.value), limit, 1))
  const y = linear(0, max, BH - 22, 12)
  const slot = (BW - 12) / weeks.length
  const barW = Math.min(24, slot - 6)

  return (
    <Figure
      title="Spending each week"
      meta={limit > 0 ? <span className="num tiny faint">limit {money(limit)}</span> : undefined}
      legend={limit > 0
        ? [
            { label: 'Under limit', color: 'var(--good)' },
            { label: 'Over limit', color: 'var(--bad)' },
            { label: 'Weekly limit', color: 'var(--ink-3)', dashed: true },
          ]
        : undefined}
      table={{
        columns: ['Week beginning', 'Spent', ...(limit > 0 ? ['Result'] : [])],
        rows: weeks.map((w) => [
          formatShort(w.start),
          money(w.value),
          ...(limit > 0 ? [w.value === 0 ? '—' : w.value <= limit ? 'Under' : 'Over'] : []),
        ]),
      }}
    >
      <div className="chart" onPointerLeave={clear}>
        <svg viewBox={`0 0 ${BW} ${BH}`} className="chart__svg" role="img"
             aria-label={`Spending each week, against a limit of ${money(limit)}`}>
          <line x1="6" y1={y(0)} x2={BW - 6} y2={y(0)} stroke="var(--rule-soft)" strokeWidth="1" />
          {limit > 0 && (
            <line x1="6" y1={y(limit)} x2={BW - 6} y2={y(limit)}
                  stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="4 4" />
          )}

          {weeks.map((w, i) => {
            const cx = 6 + slot * i + slot / 2
            const top = y(w.value)
            const h = Math.max(w.value > 0 ? 2 : 0, y(0) - top)
            const over = limit > 0 && w.value > limit
            const isHot = hovered?.index === i
            return (
              <g key={w.key}>
                <rect
                  x={cx - barW / 2} y={top} width={barW} height={h} rx="2"
                  fill={over ? 'var(--bad)' : 'var(--good)'}
                  opacity={hovered && !isHot ? 0.55 : 1}
                />
                <text x={cx} y={BH - 6} textAnchor="middle" className="chart__tick">
                  {formatShort(w.start).split(' ')[0]}
                </text>
                <rect
                  x={cx - slot / 2} y={0} width={slot} height={BH} fill="transparent"
                  tabIndex={0} role="button"
                  aria-label={`Week of ${formatShort(w.start)}: ${money(w.value)}${over ? ', over the limit' : ''}`}
                  onPointerEnter={() => show(i, w)}
                  onFocus={() => show(i, w)}
                  onBlur={clear}
                />
              </g>
            )
          })}
        </svg>
        <p className="chart__read tiny faint">
          {hovered
            ? <>Week of {formatShort(hovered.datum.start)} · <span className="num">{money(hovered.datum.value)}</span></>
            : <>Last {weeks.length} weeks</>}
        </p>
      </div>
    </Figure>
  )
}

/* ================================================================= heatmap */

export function Heatmap({ grid, money }: { grid: HeatCell[][]; money: (c: number) => string }) {
  const { hovered, show, clear } = useHovered<HeatCell>()
  const active = grid.flat().filter((c) => c.value > 0)

  // Label the first column of each month, but never two labels within three
  // columns of each other — at 10px a column they overlap and become mush.
  let lastMonth = ''
  let lastLabelAt = -99
  const monthLabels = grid.map((col, i) => {
    const month = col[0].date.slice(0, 7)
    if (month === lastMonth) return ''
    lastMonth = month
    if (i - lastLabelAt < 3) return ''
    lastLabelAt = i
    return formatMonthLabel(month).slice(0, 3)
  })

  return (
    <Figure
      title="Days you saved"
      meta={<span className="num tiny faint">{active.length} days</span>}
      table={{
        columns: ['Date', 'Saved'],
        rows: active.slice(-40).reverse().map((c) => [formatShort(c.date), money(c.value)]),
      }}
    >
      <div className="heatwrap" onPointerLeave={clear}>
        <div className="heat__months" aria-hidden>
          {monthLabels.map((l, i) => <span className="heat__month" key={i}>{l}</span>)}
        </div>
        <div className="heat" role="img"
             aria-label={`${active.length} days with a deposit in the last ${grid.length} weeks`}>
          {grid.map((col, i) => (
            <div className="heat__col" key={i}>
              {col.map((cell, j) => (
                <button
                  key={cell.date}
                  className={`heat__cell heat__cell--l${cell.level}`}
                  tabIndex={cell.value > 0 ? 0 : -1}
                  aria-label={cell.value > 0
                    ? `${formatShort(cell.date)}: ${money(cell.value)}`
                    : `${formatShort(cell.date)}: nothing saved`}
                  onPointerEnter={() => show(i * 7 + j, cell)}
                  onFocus={() => show(i * 7 + j, cell)}
                  onBlur={clear}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="row row--between">
          <p className="tiny faint">
            {hovered
              ? <>{formatShort(hovered.datum.date)} · <span className="num">
                  {hovered.datum.value > 0 ? money(hovered.datum.value) : 'nothing'}</span></>
              : <><span className="num">{active.length}</span> active days</>}
          </p>
          <span className="heat__key tiny faint">
            less
            {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`heat__cell heat__cell--l${l}`} />)}
            more
          </span>
        </div>
      </div>
    </Figure>
  )
}

/* =================================================================== donut */

export type Slice = { label: string; value: number; color: string }

export function Donut({ slices, money }: { slices: Slice[]; money: (c: number) => string }) {
  const total = slices.reduce((n, s) => n + Math.max(0, s.value), 0)
  if (total <= 0 || slices.length < 2) return null

  const size = 118
  const r = 46
  const stroke = 16
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <Figure
      title="Where it sits"
      table={{
        columns: ['Vault', 'Amount', 'Share'],
        rows: slices.map((s) => [s.label, money(s.value), `${Math.round((s.value / total) * 100)}%`]),
      }}
    >
      <div className="donut">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
             aria-label={`Split by vault: ${slices.map((s) => `${s.label} ${money(s.value)}`).join(', ')}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
          {slices.map((s) => {
            const dash = (Math.max(0, s.value) / total) * c
            const el = (
              <circle
                key={s.label}
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={s.color} strokeWidth={stroke}
                /* 2px of surface between segments, per the mark spec. */
                strokeDasharray={`${Math.max(0, dash - 2)} ${c - dash + 2}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )
            offset += dash
            return el
          })}
        </svg>

        {/* Every slice is directly labelled — colour never carries it alone. */}
        <ul className="donut__legend">
          {slices.map((s) => (
            <li key={s.label}>
              <i className="donut__swatch" style={{ background: s.color }} aria-hidden />
              <span className="grow truncate">{s.label}</span>
              <span className="num tiny">{money(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Figure>
  )
}
