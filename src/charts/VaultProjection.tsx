import { useId } from 'react'
import type { VaultView } from '@/domain/selectors'
import { daysBetween, formatShort, todayISO } from '@/domain/dates'
import { linear, smoothPath } from './scale'

const W = 320
const H = 130
const PAD = { top: 12, right: 10, bottom: 20, left: 10 }

/**
 * The vault's story in one picture: the line you've actually drawn so far, the
 * dashed line you're on course to draw, the target, and the deadline. Whether
 * the dashes cross the target line before the deadline marker *is* the answer.
 */
export function VaultProjection({ vault, money }: { vault: VaultView; money: (c: number) => string }) {
  const id = useId()
  const today = todayISO()
  const { pace } = vault
  const target = vault.target

  if (target == null || target <= 0) return null

  const start = vault.entries.length > 0 ? vault.entries[0].date : vault.createdAt
  const endCandidates = [today, vault.deadline, pace.projectedFinish].filter(Boolean) as string[]
  const end = endCandidates.reduce((a, b) => (b > a ? b : a), today)

  const totalDays = Math.max(1, daysBetween(start, end))
  const x = linear(0, totalDays, PAD.left, W - PAD.right)
  const maxY = Math.max(target, vault.saved) * 1.06
  const y = linear(0, maxY, H - PAD.bottom, PAD.top)

  /* ------------------------------------------------- the line drawn so far */
  let running = 0
  const actual: Array<[number, number]> = [[x(0), y(0)]]
  for (const e of vault.entries) {
    running += e.kind === 'deposit' ? e.amount : -e.amount
    actual.push([x(daysBetween(start, e.date)), y(Math.max(0, running))])
  }
  actual.push([x(daysBetween(start, today)), y(Math.max(0, vault.saved))])

  const line = smoothPath(actual)
  const area = `${line} L${actual[actual.length - 1][0]},${y(0)} L${actual[0][0]},${y(0)} Z`

  /* ---------------------------------------------------------- the forecast */
  const forecast =
    pace.projectedFinish && pace.remaining > 0
      ? `M${x(daysBetween(start, today))},${y(vault.saved)} L${x(daysBetween(start, pace.projectedFinish))},${y(target)}`
      : null

  const deadlineX = vault.deadline ? x(daysBetween(start, vault.deadline)) : null
  const inTime = pace.daysEarly != null && pace.daysEarly >= 0

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img"
           aria-label={`${vault.name}: ${money(vault.saved)} of ${money(target)} saved${
             pace.projectedFinish ? `, projected to finish ${pace.projectedFinish}` : ''}`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--vault-accent, var(--accent))" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--vault-accent, var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* target line */}
        <line x1={PAD.left} y1={y(target)} x2={W - PAD.right} y2={y(target)}
              stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 4" />
        <text x={PAD.left} y={y(target) - 5} className="chart__label">{money(target)}</text>

        {/* deadline */}
        {deadlineX != null && (
          <>
            <line x1={deadlineX} y1={PAD.top - 4} x2={deadlineX} y2={H - PAD.bottom}
                  stroke={inTime ? 'var(--good)' : 'var(--bad)'} strokeWidth="1.5" strokeDasharray="2 3" opacity="0.8" />
            <text x={Math.min(deadlineX, W - PAD.right - 34)} y={H - 6} className="chart__label">
              {formatShort(vault.deadline!)}
            </text>
          </>
        )}

        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke="var(--vault-accent, var(--accent))" strokeWidth="2.4"
              strokeLinecap="round" strokeLinejoin="round" />

        {forecast && (
          <path d={forecast} fill="none" stroke={inTime ? 'var(--good)' : 'var(--warn)'}
                strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" opacity="0.9" />
        )}

        {/* where you are right now */}
        <circle cx={x(daysBetween(start, today))} cy={y(vault.saved)} r="4"
                fill="var(--vault-accent, var(--accent))" stroke="var(--bg)" strokeWidth="2" />

        <text x={PAD.left} y={H - 6} className="chart__label">{formatShort(start)}</text>
      </svg>

      <figcaption className="chart__legend tiny faint">
        <span><i className="dot dot--solid" /> saved so far</span>
        <span><i className="dot dot--dash" /> on current pace</span>
        {vault.deadline && <span><i className={`dot ${inTime ? 'dot--good' : 'dot--bad'}`} /> deadline</span>}
      </figcaption>
    </figure>
  )
}
