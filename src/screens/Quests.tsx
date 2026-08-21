import { useState } from 'react'
import { dispatch, useHoard, useRawState } from '@/store/store'
import { useFormat } from '@/app/format'
import { QuestRow } from '@/ui/parts'
import { Bar } from '@/ui/Bar'
import { Sheet } from '@/ui/Sheet'
import { parseAmount } from '@/domain/money'
import { niceMoney } from '@/domain/quests'
import { todayISO } from '@/domain/dates'
import type { QuestTier } from '@/domain/quests'
import { toast } from '@/ui/toast'
import { haptic, soundClaim } from '@/ui/feedback'

const TIERS: Array<{ key: QuestTier; title: string; blurb: string }> = [
  { key: 'daily', title: 'Today', blurb: 'Resets at midnight' },
  { key: 'weekly', title: 'This week', blurb: 'Resets Sunday night' },
  { key: 'monthly', title: 'This month', blurb: 'Resets on the 1st' },
]

export function Quests() {
  const d = useHoard()
  const profile = useRawState().profile
  const fmt = useFormat()
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetRaw, setTargetRaw] = useState('')

  const claim = (id: string, xp: number) => {
    dispatch({ type: 'quest/claim', id, date: todayISO() })
    soundClaim()
    haptic([8, 24, 8])
    toast('Quest claimed', '📜', xp)
  }

  const openTargetEditor = () => {
    setTargetRaw(profile.monthlyTarget > 0 ? String(profile.monthlyTarget / 100) : '')
    setEditingTarget(true)
  }

  const saveTarget = () => {
    const cents = parseAmount(targetRaw)
    dispatch({ type: 'profile/update', patch: { monthlyTarget: cents && cents > 0 ? cents : 0 } })
    toast(cents && cents > 0 ? `Monthly target set to ${fmt.money(cents)}` : 'Monthly target cleared', '🎯')
    setEditingTarget(false)
  }

  const suggestions = [
    niceMoney(Math.max(5_000, d.records.medianWeek * 4)),
    niceMoney(Math.max(10_000, d.records.medianWeek * 5)),
    niceMoney(Math.max(20_000, d.records.medianWeek * 8)),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const claimable = d.quests.filter((q) => q.claimable).length

  return (
    <div className="stack stack--lg">
      {/* ----------------------------------------------------- monthly target */}
      <section className="card card--pad-lg stack stack--md">
        <div className="row row--between">
          <div>
            <p className="tiny faint">{d.month.label} target</p>
            <p className="hero__total hero__total--sm money">
              {profile.monthlyTarget > 0 ? fmt.money(profile.monthlyTarget) : 'Not set'}
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={openTargetEditor}>
            {profile.monthlyTarget > 0 ? 'Change' : 'Set one'}
          </button>
        </div>

        {profile.monthlyTarget > 0 ? (
          <>
            <Bar value={d.month.fraction} marker={d.month.expectedFraction} tall
                 tone={d.month.hit ? 'good' : 'accent'} label="Monthly target progress" />
            <div className="row row--between tiny">
              <span className="money">{fmt.money(d.month.saved)}</span>
              <span className="faint">
                {d.month.hit ? 'Target hit 🎉' : `${fmt.money(d.month.remaining)} to go`}
              </span>
            </div>
            <p className="tiny faint">
              {d.month.daysLeft} days left in {d.month.label.split(' ')[0]}.
              {' '}{d.month.hit
                ? 'Everything from here is a bonus.'
                : d.month.onPace
                  ? "You're ahead of an even pace — the marker on the bar is where you'd be."
                  : `Roughly ${fmt.money(Math.ceil(d.month.remaining / Math.max(1, d.month.daysLeft)))} a day gets you there.`}
            </p>
          </>
        ) : (
          <p className="small muted">
            A monthly target gives the app something to pace you against — and it's worth
            300 XP every month you hit it.
          </p>
        )}
      </section>

      {/* -------------------------------------------------------------- quests */}
      {claimable > 0 && (
        <p className="badge badge--accent" style={{ alignSelf: 'flex-start' }}>
          ✨ {claimable} {claimable === 1 ? 'reward' : 'rewards'} ready to claim
        </p>
      )}

      {TIERS.map(({ key, title, blurb }) => {
        const list = d.quests.filter((q) => q.tier === key)
        if (list.length === 0) return null
        return (
          <section key={key}>
            <h2 className="section-title">{title}<span className="faint">{blurb}</span></h2>
            <ul className="stack stack--sm">
              {list.map((q) => (
                <QuestRow key={q.id} quest={q} money={fmt.money} onClaim={() => claim(q.id, q.xp)} />
              ))}
            </ul>
          </section>
        )
      })}

      <p className="tiny faint center">
        Quests are fixed for their period — refreshing won't reroll them, and their
        targets scale to what you actually save.
      </p>

      <Sheet
        open={editingTarget}
        onClose={() => setEditingTarget(false)}
        title="Monthly target"
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setEditingTarget(false)}>Cancel</button>
            <button className="btn btn--primary grow" onClick={saveTarget}>Save target</button>
          </>
        }
      >
        <div className="stack">
          <div className="amount">
            <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
            <input
              className="amount__input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              aria-label="Monthly target"
              value={targetRaw}
              onChange={(e) => setTargetRaw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTarget() }}
            />
          </div>
          <div className="row row--tight row--wrap">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => setTargetRaw(String(s / 100))}>
                {fmt.money(s)}
              </button>
            ))}
            <button className="chip" onClick={() => setTargetRaw('')}>Clear</button>
          </div>
          <p className="tiny faint">
            Pick something you'd hit most months. A target you miss every month stops
            meaning anything.
          </p>
        </div>
      </Sheet>
    </div>
  )
}
