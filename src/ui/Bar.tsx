type Props = {
  /** 0–1. */
  value: number
  /** Optional hairline showing where an even pace would put you. */
  marker?: number
  tall?: boolean
  thin?: boolean
  color?: string
  tone?: 'accent' | 'good' | 'vault'
  label?: string
  className?: string
}

export function Bar({ value, marker, tall, thin, color, tone = 'accent', label, className }: Props) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100
  const fillClass =
    tone === 'good' ? 'bar__fill bar__fill--good'
    : tone === 'vault' ? 'bar__fill bar__fill--accent'
    : 'bar__fill'

  return (
    <div
      className={`bar ${tall ? 'bar--tall' : ''} ${thin ? 'bar--thin' : ''} ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={fillClass} style={{ width: `${pct}%`, ...(color ? { background: color } : null) }} />
      {marker != null && marker > 0 && marker < 1 && (
        <span className="bar__marker" style={{ left: `${marker * 100}%` }} aria-hidden />
      )}
    </div>
  )
}
