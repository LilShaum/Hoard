import type { ReactNode } from 'react'
import type { Pace } from '@/domain/pace'
import { PACE_TONE } from '@/domain/pace'
import type { VaultView } from '@/domain/selectors'
import type { Quest } from '@/domain/quests'
import { questDetail } from '@/domain/quests'
import type { Entry } from '@/domain/types'
import { formatCountdown, formatRelativeDay } from '@/domain/dates'
import { Bar } from './Bar'
import { IconCheck, IconLock } from './Icons'
import type { AchievementView } from '@/domain/achievements'

/* --------------------------------------------------------------- pace badge */

export function PaceBadge({ pace }: { pace: Pace }) {
  if (pace.status === 'open') return null
  const tone = PACE_TONE[pace.status]
  const icon = { done: '🏆', ahead: '🚀', ontrack: '✅', behind: '⚠️', atrisk: '🔥', nodata: '💤', open: '' }[pace.status]
  const cls = tone === 'good' ? 'badge--good' : tone === 'warn' ? 'badge--warn' : tone === 'bad' ? 'badge--bad' : ''
  return <span className={`badge ${cls}`}><span aria-hidden>{icon}</span>{pace.label}</span>
}

/* --------------------------------------------------------------- vault card */

type VaultCardProps = {
  vault: VaultView
  money: (c: number) => string
  onOpen: () => void
  compact?: boolean
}

export function VaultCard({ vault, money, onOpen, compact }: VaultCardProps) {
  const { pace } = vault
  const accent = `var(--a-${vault.color})`

  return (
    <button
      className={`vaultcard ${compact ? 'vaultcard--compact' : ''} card card--tap`}
      style={{ ['--vault-accent' as string]: accent }}
      onClick={onOpen}
      aria-label={`${vault.name}, ${money(vault.saved)}${vault.target ? ` of ${money(vault.target)}` : ''}`}
    >
      <span className="vaultcard__glyph" aria-hidden>{vault.emoji}</span>

      <span className="vaultcard__body">
        <span className="vaultcard__head">
          <span className="vaultcard__name truncate">{vault.name}</span>
          {vault.isComplete
            ? <span className="badge badge--good"><IconCheck size={12} strokeWidth={3} />Full</span>
            : <PaceBadge pace={pace} />}
        </span>

        <span className="vaultcard__figures money">
          <strong>{money(vault.saved)}</strong>
          {vault.target != null && <span className="faint"> / {money(vault.target)}</span>}
        </span>

        {vault.target != null && (
          <Bar value={pace.fraction} tone="vault" label={`${Math.round(pace.fraction * 100)}% of ${vault.name}`} />
        )}

        <span className="vaultcard__foot tiny faint">
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

/* ---------------------------------------------------------------- quest row */

type QuestRowProps = {
  quest: Quest
  money: (c: number) => string
  onClaim: () => void
}

const TIER_LABEL: Record<Quest['tier'], string> = { daily: 'Today', weekly: 'This week', monthly: 'This month' }

export function QuestRow({ quest, money, onClaim }: QuestRowProps) {
  const value = quest.unit === 'money' ? money(quest.progress) : String(quest.progress)
  const goal = quest.unit === 'money' ? money(quest.target) : String(quest.target)

  return (
    <li className={`questrow ${quest.claimed ? 'questrow--claimed' : ''}`}>
      <div className="questrow__main">
        <div className="row row--between row--tight">
          <span className="questrow__title">{quest.title}</span>
          <span className="badge badge--accent">+{quest.xp} XP</span>
        </div>
        <p className="tiny muted">{questDetail(quest, money)}</p>
        <Bar value={quest.fraction} thin tone={quest.done ? 'good' : 'accent'} />
        <span className="tiny faint">
          {TIER_LABEL[quest.tier]} · {value} / {goal}
        </span>
      </div>

      {quest.claimable ? (
        <button className="btn btn--primary btn--sm questrow__claim" onClick={onClaim}>Claim</button>
      ) : quest.claimed ? (
        <span className="questrow__done" aria-label="Claimed"><IconCheck size={16} strokeWidth={3} /></span>
      ) : null}
    </li>
  )
}

/* ------------------------------------------------------------- activity row */

type ActivityProps = {
  entry: Entry
  vaultName: string
  vaultEmoji: string
  money: (c: number) => string
  onDelete?: () => void
  action?: ReactNode
}

export function ActivityRow({ entry, vaultName, vaultEmoji, money, action }: ActivityProps) {
  const isDeposit = entry.kind === 'deposit'
  return (
    <li className="activity">
      <span className="activity__glyph" aria-hidden>{vaultEmoji}</span>
      <span className="grow">
        <span className="activity__title truncate">{entry.note || vaultName}</span>
        <span className="tiny faint">{formatRelativeDay(entry.date)}{entry.note ? ` · ${vaultName}` : ''}</span>
      </span>
      <span className={`activity__amount money ${isDeposit ? 'is-in' : 'is-out'}`}>
        {isDeposit ? '+' : '−'}{money(entry.amount)}
      </span>
      {action}
    </li>
  )
}

/* --------------------------------------------------------- achievement tile */

export function AchievementTile({ badge }: { badge: AchievementView }) {
  const hidden = badge.hidden && !badge.unlocked
  return (
    <li
      className={`ach ach--t${badge.tier} ${badge.unlocked ? 'is-unlocked' : ''}`}
      title={hidden ? 'Hidden — keep saving' : `${badge.name}: ${badge.description}`}
    >
      <span className="ach__icon" aria-hidden>{hidden ? '❓' : badge.icon}</span>
      <span className="ach__name">{hidden ? 'Hidden' : badge.name}</span>
      {badge.unlocked ? (
        <span className="tiny faint">{badge.xp > 0 ? `+${badge.xp} XP` : 'Prestige'}</span>
      ) : hidden ? (
        <span className="tiny faint">???</span>
      ) : badge.fraction > 0 ? (
        <Bar value={badge.fraction} thin />
      ) : (
        <span className="ach__lock" aria-hidden><IconLock size={13} /></span>
      )}
      <span className="sr-only">
        {badge.unlocked ? 'Unlocked' : 'Locked'}. {hidden ? 'Hidden achievement' : badge.description}
      </span>
    </li>
  )
}
