import { useState } from 'react'
import { dispatch, useHoard, useRawState } from '@/store/store'
import { useFormat } from '@/app/format'
import { QuestRow, Notch, Meter, Status } from '@/ui/parts'
import { Sheet } from '@/ui/Sheet'
import { parseAmount } from '@/domain/money'
import { niceMoney } from '@/domain/quests'
import { plural, todayISO } from '@/domain/dates'
import { BUDGET_LABEL } from '@/domain/budget'
import type { QuestTier } from '@/domain/quests'
import { toast } from '@/ui/toast'
import { haptic, soundClaim } from '@/ui/feedback'

const TIERS: Array<{ key: QuestTier; title: string; blurb: string }> = [
  { key: 'daily', title: 'Today', blurb: 'Resets at midnight' },
  { key: 'weekly', title: 'This week', blurb: 'Resets Sunday night' },
  { key: 'monthly', title: 'This month', blurb: 'Resets on the 1st' },
]

type Editing = null | 'monthly' | 'weekly'

export function Quests() {
  const d = useHoard()
  const profile = useRawState().profile
  const fmt = useFormat()
  const [editing, setEditing] = useState<Editing>(null)
  const [raw, setRaw] = useState('')

  const claim = (id: string, xp: number) => {
    dispatch({ type: 'quest/claim', id, date: todayISO() })
    soundClaim()
    haptic([8, 24, 8])
    toast('Quest claimed', xp)
  }

  const openEditor = (which: Exclude<Editing, null>) => {
    const current = which === 'monthly' ? profile.monthlyTarget : profile.weeklyLimit
    setRaw(current > 0 ? String(current / 100) : '')
    setEditing(which)
  }

  const saveGoal = () => {
    const cents = parseAmount(raw)
    const value = cents && cents > 0 ? cents : 0
    if (editing === 'monthly') {
      dispatch({ type: 'profile/update', patch: { monthlyTarget: value } })
      toast(value > 0 ? `Monthly deposit goal set to ${fmt.money(value)}` : 'Monthly goal cleared')
    } else {
      dispatch({ type: 'profile/update', patch: { weeklyLimit: value } })
      toast(value > 0 ? `Weekly spending limit set to ${fmt.money(value)}` : 'Weekly limit cleared')
    }
    setEditing(null)
  }

  const suggestions = editing === 'weekly'
    ? [niceMoney(Math.max(5_000, d.records.medianWeek)), niceMoney(Math.max(10_000, d.records.medianWeek * 2)), 20_000, 30_000]
        .filter((v, i, a) => a.indexOf(v) === i)
    : [
        niceMoney(Math.max(5_000, d.records.medianWeek * 4)),
        niceMoney(Math.max(10_000, d.records.medianWeek * 5)),
        niceMoney(Math.max(20_000, d.records.medianWeek * 8)),
      ].filter((v, i, a) => a.indexOf(v) === i)

  const claimable = d.quests.filter((q) => q.claimable).length
  const budgetTone = d.budget.status === 'over' ? 'bad' : d.budget.status === 'close' ? 'warn' : 'good'

  return (
    <div className="stack stack--lg">
      {/* --------------------------------------------- monthly deposit goal */}
      <section className="panel">
        <header className="panel__head">
          <span className="label">{d.month.label} deposit goal</span>
          <button className="btn btn--link" onClick={() => openEditor('monthly')}>
            {profile.monthlyTarget > 0 ? 'Change' : 'Set one'}
          </button>
        </header>

        <div className="panel__body stack stack--sm">
          <p className="num--hero hoard__total hoard__total--sm">
            {profile.monthlyTarget > 0 ? fmt.money(profile.monthlyTarget) : 'Not set'}
          </p>

          {profile.monthlyTarget > 0 ? (
            <>
              <Notch value={d.month.fraction} marker={d.month.expectedFraction} tall
                     color={d.month.hit ? 'var(--good)' : undefined}
                     label="Monthly deposit goal" />
              <div className="row row--between tiny num">
                <span>{fmt.money(d.month.saved)} saved</span>
                <span className="faint">
                  {d.month.hit ? 'Goal met' : `${fmt.money(d.month.remaining)} to go`}
                </span>
              </div>
              <p className="tiny faint">
                {plural(d.month.daysLeft, 'day')} left.{' '}
                {d.month.hit
                  ? 'Everything from here is a bonus.'
                  : `About ${fmt.money(Math.ceil(d.month.remaining / Math.max(1, d.month.daysLeft)))} a day gets you there.`}
              </p>
            </>
          ) : (
            <p className="small muted">
              How much you want to put away each month. Worth 300 XP every month you hit it.
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------- weekly spend limit */}
      <section className="panel">
        <header className="panel__head">
          <span className="label">Weekly spending limit</span>
          <button className="btn btn--link" onClick={() => openEditor('weekly')}>
            {profile.weeklyLimit > 0 ? 'Change' : 'Set one'}
          </button>
        </header>

        <div className="panel__body stack stack--sm">
          <p className="num--hero hoard__total hoard__total--sm">
            {profile.weeklyLimit > 0 ? fmt.money(profile.weeklyLimit) : 'Not set'}
          </p>

          {profile.weeklyLimit > 0 ? (
            <>
              <Meter
                value={d.budget.fraction}
                color={d.budget.status === 'over' ? 'var(--bad)'
                     : d.budget.status === 'close' ? 'var(--warn)' : 'var(--good)'}
                label="Weekly spending against the limit"
              />
              <div className="row row--between">
                <span className="tiny num">{fmt.money(d.budget.spent)} spent</span>
                <Status tone={budgetTone}>{BUDGET_LABEL[d.budget.status]}</Status>
              </div>
              <p className="tiny faint">
                {fmt.money(d.budget.safePerDay)} a day is safe for the {d.budget.daysLeft}{' '}
                {d.budget.daysLeft === 1 ? 'day' : 'days'} left in the week.
                {d.budget.streak > 0 && (
                  ` ${d.budget.streak} ${d.budget.streak === 1 ? 'week' : 'weeks'} running under it.`
                )}
              </p>
            </>
          ) : (
            <p className="small muted">
              How much you want to spend each week. Set it and Hoard tells you what is
              safe to spend today rather than only what you have already spent.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ quests */}
      {claimable > 0 && (
        <p className="claimbar">
          {claimable} {claimable === 1 ? 'reward' : 'rewards'} ready to claim
        </p>
      )}

      {TIERS.map(({ key, title, blurb }) => {
        const list = d.quests.filter((q) => q.tier === key)
        if (list.length === 0) return null
        return (
          <section key={key} className="section">
            <div className="section__head">
              <span className="label">{title}</span>
              <span className="tiny faint">{blurb}</span>
            </div>
            <ul className="stack stack--sm">
              {list.map((q) => (
                <QuestRow key={q.id} quest={q} money={fmt.money} onClaim={() => claim(q.id, q.xp)} />
              ))}
            </ul>
          </section>
        )
      })}

      <p className="tiny faint center">
        Quests are fixed for their period — refreshing will not reroll them, and their
        targets scale to what you actually save.
      </p>

      <Sheet
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing === 'weekly' ? 'Weekly spending limit' : 'Monthly deposit goal'}
        footer={
          <>
            <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn--primary" onClick={saveGoal}>Save</button>
          </>
        }
      >
        <div className="stack">
          <div className="amount">
            <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
            <input
              className="amount__input num"
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Amount"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveGoal() }}
            />
          </div>
          <div className="row row--tight row--wrap">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => setRaw(String(s / 100))}>
                {fmt.money(s)}
              </button>
            ))}
            <button className="chip" onClick={() => setRaw('')}>Clear</button>
          </div>
          <p className="tiny faint">
            {editing === 'weekly'
              ? 'Pick something you could actually live on. A limit you break every week stops meaning anything.'
              : 'Pick something you would hit most months, not your best month.'}
          </p>
        </div>
      </Sheet>
    </div>
  )
}
