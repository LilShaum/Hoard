import type { ReactNode } from 'react'
import type { Entry, TypeKey } from '@/domain/types'
import type { Pace } from '@/domain/pace'
import { PACE_TONE } from '@/domain/pace'
import type { VaultView } from '@/domain/selectors'
import type { Quest } from '@/domain/quests'
import { questDetail } from '@/domain/quests'
import type { AchievementView } from '@/domain/achievements'
import { formatCountdown, formatRelativeDay } from '@/domain/dates'
import { TYPE_LABEL } from '@/store/defaults'
import { Glyph } from './Glyphs'
import { Badge } from './Badge'
import { IconCheck } from './Icons'

/* ============================================================== notch bar */

type NotchProps = {
  /** 0–1. Values above 1 fill every cell and flag as over. */
  value: number
  cells?: number
  color?: string
  tall?: boolean
  thin?: boolean
  /** 0–1 position of the even-pace marker. */
  marker?: number
  over?: boolean
  label: string
}

/**
 * Progress as a countable row of cells. A smooth bar tells you roughly how far
 * along you are; ten notches tell you it's six.
 */
export function Notch({ value, cells = 10, color, tall, thin, marker, over, label }: NotchProps) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  const exact = safe * cells
  const full = Math.floor(exact)
  const hasPartial = exact - full >= 0.15 && full < cells

  const bar = (
    <div
      className={`notch ${tall ? 'notch--tall' : ''} ${thin ? 'notch--thin' : ''}`}
      style={color ? ({ ['--notch-color' as string]: color }) : undefined}
      role="progressbar"
      aria-valuenow={Math.round(Math.min(1, safe) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={`notch__cell ${
            over && i < Math.min(cells, full) ? 'is-over'
            : i < full ? 'is-on'
            : hasPartial && i === full ? 'is-part'
            : ''}`}
        />
      ))}
    </div>
  )

  if (marker == null || marker <= 0 || marker >= 1) return bar
  return (
    <div className="notch__wrap">
      {bar}
      <span className="notch__mark" style={{ left: `${marker * 100}%` }} aria-hidden />
    </div>
  )
}

/** Continuous meter — for a fraction that isn't meaningfully countable. */
export function Meter({ value, color, label }: { value: number; color?: string; label: string }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={color ? ({ ['--meter-color' as string]: color }) : undefined}
    >
      <div className="meter__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/* =============================================================== type chip */

export function TypeChip({ type }: { type: TypeKey }) {
  return (
    <span
      className="tchip"
      style={{ ['--tc' as string]: `var(--t-${type})`, ['--tc-ink' as string]: `var(--on-${type})` }}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}

/* ================================================================== status */

type Tone = 'good' | 'warn' | 'bad' | 'none'

/**
 * Status never travels on colour alone — two of the three status hues sit below
 * 3:1 on the light plane by design, so every one of these carries a word.
 */
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`stat stat--${tone}`}>
      <span className="stat__dot" aria-hidden />
      {children}
    </span>
  )
}

const PACE_TONE_MAP: Record<string, Tone> = { good: 'good', warn: 'warn', bad: 'bad', neutral: 'none' }

export function PaceStatus({ pace }: { pace: Pace }) {
  if (pace.status === 'open') return null
  return <Status tone={PACE_TONE_MAP[PACE_TONE[pace.status]]}>{pace.label}</Status>
}

/* ============================================================== vault card */

type VaultCardProps = {
  vault: VaultView
  money: (c: number) => string
  onOpen: () => void
}

export function VaultCard({ vault, money, onOpen }: VaultCardProps) {
  const { pace } = vault
  const tint = `var(--t-${vault.type})`

  return (
    <button
      className="vaultcard panel"
      onClick={onOpen}
      aria-label={`${vault.name}, ${money(vault.saved)}${vault.target ? ` of ${money(vault.target)}` : ''}`}
    >
      <span className="vaultcard__head panel__head">
        <span className="row row--tight" style={{ minWidth: 0 }}>
          <span className="vaultcard__glyph" style={{ color: tint }}>
            <Glyph name={vault.glyph} size={19} />
          </span>
          <span className="vaultcard__name truncate">{vault.name}</span>
        </span>
        <TypeChip type={vault.type} />
      </span>

      <span className="vaultcard__body">
        <span className="row row--between">
          <span className="num vaultcard__figure">
            {money(vault.saved)}
            {vault.target != null && <span className="faint"> / {money(vault.target)}</span>}
          </span>
          {vault.isComplete
            ? <Status tone="good">Full</Status>
            : <PaceStatus pace={pace} />}
        </span>

        {vault.target != null && (
          <Notch
            value={pace.fraction}
            color={tint}
            label={`${Math.round(pace.fraction * 100)}% of ${vault.name}`}
          />
        )}

        <span className="tiny faint">
          {vault.target == null
            ? 'Open vault — no target'
            : vault.isComplete
              ? 'Target reached'
              : <>{money(pace.remaining)} to go{vault.deadline ? ` · ${formatCountdown(vault.deadline)}` : ''}</>}
        </span>
      </span>
    </button>
  )
}

/* =============================================================== quest row */

const TIER_LABEL: Record<Quest['tier'], string> = {
  daily: 'Today', weekly: 'This week', monthly: 'This month',
}

export function QuestRow({ quest, money, onClaim }: {
  quest: Quest; money: (c: number) => string; onClaim: () => void
}) {
  const value = quest.unit === 'money' ? money(quest.progress) : String(quest.progress)
  const goal = quest.unit === 'money' ? money(quest.target) : String(quest.target)

  return (
    <li className={`questrow panel ${quest.claimed ? 'is-claimed' : ''}`}>
      <div className="questrow__main">
        <div className="row row--between row--tight">
          <span className="questrow__title">{quest.title}</span>
          <span className="questrow__xp num">+{quest.xp} XP</span>
        </div>
        <p className="tiny muted">{questDetail(quest, money)}</p>
        <Notch value={quest.fraction} cells={quest.unit === 'count' ? quest.target : 10} thin
               color={quest.done ? 'var(--good)' : undefined} label={quest.title} />
        <span className="tiny faint num">{TIER_LABEL[quest.tier]} · {value} / {goal}</span>
      </div>

      {quest.claimable ? (
        <button className="btn btn--primary btn--sm questrow__claim" onClick={onClaim}>Claim</button>
      ) : quest.claimed ? (
        <span className="questrow__done" aria-label="Claimed"><IconCheck size={15} strokeWidth={3} /></span>
      ) : null}
    </li>
  )
}

/* ============================================================ activity row */

export function ActivityRow({ entry, vaultName, glyph, type, money, action }: {
  entry: Entry
  vaultName: string
  glyph: Parameters<typeof Glyph>[0]['name']
  type: TypeKey | null
  money: (c: number) => string
  action?: ReactNode
}) {
  const tone =
    entry.kind === 'deposit' ? 'is-in' : entry.kind === 'withdrawal' ? 'is-out' : 'is-spend'
  const sign = entry.kind === 'deposit' ? '+' : '−'

  return (
    <li className="activity">
      <span className="activity__glyph" style={type ? { color: `var(--t-${type})` } : undefined}>
        <Glyph name={glyph} size={17} />
      </span>
      <span className="grow">
        <span className="activity__title truncate">{entry.note || vaultName}</span>
        <span className="tiny faint">
          {formatRelativeDay(entry.date)}
          {entry.kind === 'spend' ? ' · Spending' : entry.note ? ` · ${vaultName}` : ''}
        </span>
      </span>
      <span className={`activity__amount num ${tone}`}>{sign}{money(entry.amount)}</span>
      {action}
    </li>
  )
}

/* ========================================================= achievement tile */

export function AchievementTile({ badge }: { badge: AchievementView }) {
  const hidden = badge.hidden && !badge.unlocked
  return (
    <li className={`ach ${badge.unlocked ? 'is-unlocked' : ''}`}
        title={hidden ? 'Hidden — keep saving' : `${badge.name}: ${badge.description}`}>
      <Badge shape={badge.shape} tier={badge.tier} unlocked={badge.unlocked} size={34} />
      <span className="ach__name">{hidden ? 'Hidden' : badge.name}</span>
      {badge.unlocked ? (
        <span className="tiny faint num">{badge.xp > 0 ? `+${badge.xp}` : '—'}</span>
      ) : hidden ? (
        <span className="tiny faint">???</span>
      ) : badge.fraction > 0 ? (
        <Notch value={badge.fraction} cells={5} thin label={badge.name} />
      ) : (
        <span className="tiny faint">Locked</span>
      )}
      <span className="sr-only">
        {badge.unlocked ? 'Unlocked' : 'Locked'}. {hidden ? 'Hidden achievement' : badge.description}
      </span>
    </li>
  )
}
