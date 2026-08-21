import { useId } from 'react'
import type { Point, HeatCell } from '@/domain/stats'
import { formatMonthLabel, formatShort } from '@/domain/dates'
import { linear, niceMax, smoothPath } from './scale'

/* ============================================================ area chart */

const AW = 320
const AH = 132

/** Cumulative savings over time. One line, no axes clutter, ends on the total. */
export function AreaChart({ points, money }: { points: Point[]; money: (c: number) => string }) {
  const id = useId()
  if (points.length < 2) return null

  const max = niceMax(Math.max(...points.map((p) => p.value), 1))
  const x = linear(0, points.length - 1, 8, AW - 8)
  const y = linear(0, max, AH - 22, 12)

  const coords = points.map((p, i) => [x(i), y(Math.max(0, p.value))] as [number, number])
  const line = smoothPath(coords)
  const area = `${line} L${coords[coords.length - 1][0]},${y(0)} L${coords[0][0]},${y(0)} Z`
  const last = points[points.length - 1]

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${AW} ${AH}`} className="chart__svg" role="img"
           aria-label={`Total saved over time, ending at ${money(last.value)}`}>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1="8" y1={y(max)} x2={AW - 8} y2={y(max)} stroke="var(--border)" strokeWidth="1" />
        <text x="8" y={y(max) - 4} className="chart__label">{money(max)}</text>

        <path d={area} fill={`url(#${id}-g)`} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="4"
                fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />

        <text x="8" y={AH - 4} className="chart__label">{formatShort(points[0].key)}</text>
        <text x={AW - 8} y={AH - 4} textAnchor="end" className="chart__label">Today</text>
      </svg>
    </figure>
  )
}

/* ============================================================= bar chart */

const BW = 320
const BH = 140

type BarProps = {
  points: Point[]
  money: (c: number) => string
  /** Draws a dashed target line across the bars. */
  target?: number
}

export function BarChart({ points, money, target }: BarProps) {
  if (points.length === 0) return null

  const max = niceMax(Math.max(...points.map((p) => p.value), target ?? 0, 1))
  const y = linear(0, max, BH - 26, 14)
  const slot = (BW - 16) / points.length
  const barW = Math.min(30, slot * 0.6)

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${BW} ${BH}`} className="chart__svg" role="img"
           aria-label={`Saved per month: ${points.map((p) => `${p.label} ${money(p.value)}`).join(', ')}`}>
        {target != null && target > 0 && (
          <>
            <line x1="8" y1={y(target)} x2={BW - 8} y2={y(target)}
                  stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 4" opacity="0.75" />
            <text x={BW - 8} y={y(target) - 4} textAnchor="end" className="chart__label">
              target {money(target)}
            </text>
          </>
        )}

        {points.map((p, i) => {
          const cx = 8 + slot * i + slot / 2
          const value = Math.max(0, p.value)
          const top = y(value)
          const height = Math.max(value > 0 ? 3 : 0, y(0) - top)
          const hit = target != null && target > 0 && value >= target
          return (
            <g key={p.key}>
              <rect
                x={cx - barW / 2} y={top} width={barW} height={height} rx={Math.min(5, barW / 2)}
                fill={hit ? 'var(--good)' : 'var(--accent)'}
                opacity={i === points.length - 1 ? 1 : 0.65}
              />
              <text x={cx} y={BH - 6} textAnchor="middle" className="chart__label">
                {formatMonthLabel(p.key).slice(0, 3)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/* =============================================================== heatmap */

type HeatProps = { grid: HeatCell[][]; money: (c: number) => string }

/** Contribution grid. The single most motivating chart in any habit app. */
export function Heatmap({ grid, money }: HeatProps) {
  const total = grid.flat().filter((c) => c.value > 0).length

  // A label on the first column of each month, so a long grid stays readable.
  let lastMonth = ''
  const monthLabels = grid.map((col) => {
    const month = col[0].date.slice(0, 7)
    if (month === lastMonth) return ''
    lastMonth = month
    return formatMonthLabel(month).slice(0, 3)
  })

  return (
    <figure className="chart">
      <div className="heat__months" aria-hidden>
        {monthLabels.map((label, i) => (
          <span className="heat__month" key={i}>{label}</span>
        ))}
      </div>
      <div className="heat" role="img" aria-label={`${total} days with a deposit in the last ${grid.length} weeks`}>
        {grid.map((col, i) => (
          <div className="heat__col" key={i}>
            {col.map((cell) => (
              <span
                key={cell.date}
                className={`heat__cell heat__cell--l${cell.level}`}
                title={cell.value > 0 ? `${formatShort(cell.date)} · ${money(cell.value)}` : formatShort(cell.date)}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="chart__legend tiny faint">
        <span>{total} active {total === 1 ? 'day' : 'days'}</span>
        <span className="heat__key">
          less
          {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`heat__cell heat__cell--l${l}`} />)}
          more
        </span>
      </figcaption>
    </figure>
  )
}

/* ================================================================= donut */

export type Slice = { label: string; value: number; color: string; emoji?: string }

export function Donut({ slices, money }: { slices: Slice[]; money: (c: number) => string }) {
  const total = slices.reduce((n, s) => n + Math.max(0, s.value), 0)
  if (total <= 0) return null

  const size = 132
  const r = 52
  const stroke = 18
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
           aria-label={`Split by vault: ${slices.map((s) => `${s.label} ${money(s.value)}`).join(', ')}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {slices.map((s) => {
          const frac = Math.max(0, s.value) / total
          const dash = frac * c
          const el = (
            <circle
              key={s.label}
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, dash - 1.5)} ${c - dash + 1.5}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            />
          )
          offset += dash
          return el
        })}
      </svg>

      <ul className="donut__legend">
        {slices.map((s) => (
          <li key={s.label}>
            <i className="donut__swatch" style={{ background: s.color }} />
            <span className="grow truncate">{s.emoji ? `${s.emoji} ` : ''}{s.label}</span>
            <span className="money tiny">{money(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
