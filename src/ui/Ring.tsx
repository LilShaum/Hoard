import { useId, type ReactNode } from 'react'

type Props = {
  /** 0–1. */
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  /** Solid colour instead of the accent gradient. */
  color?: string
  trackOpacity?: number
  label?: string
  className?: string
}

/**
 * A progress ring. Rotated -90° so it fills clockwise from twelve o'clock,
 * which is the only direction that reads as "progress" to anyone.
 */
export function Ring({
  value, size = 84, stroke = 8, children, color, trackOpacity = 1, label, className,
}: Props) {
  const id = useId()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

  return (
    <div className={`ring ${className ?? ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden={!label}
           role={label ? 'img' : undefined} aria-label={label}>
        {!color && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--surface-2)" strokeWidth={stroke}
          opacity={trackOpacity}
        />
        <circle
          className="ring__fill"
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color ?? `url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children != null && <div className="ring__inner">{children}</div>}
    </div>
  )
}
