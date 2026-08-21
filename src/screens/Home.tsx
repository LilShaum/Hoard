import { useMemo } from 'react'
import { useHoard, useRawState, dispatch } from '@/store/store'
import { useFormat } from '@/app/format'
import { useCountUp } from '@/ui/useCountUp'
import { Ring } from '@/ui/Ring'
import { Bar } from '@/ui/Bar'
import { VaultCard, QuestRow, ActivityRow } from '@/ui/parts'
import { IconFlame, IconPlus, IconSnow, IconSpark, IconTrash } from '@/ui/Icons'
import { todayISO } from '@/domain/dates'
import { toast } from '@/ui/toast'
import { haptic, soundClaim } from '@/ui/feedback'
import type { Route } from '@/app/router'

type Props = {
  onSave: (vaultId?: string | null) => void
  navigate: (r: Route) => void
}

function greeting(name: string): string {
  const h = new Date().getHours()
  const part = h < 5 ? 'Still up' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
  return name ? `${part}, ${name}` : part
}

export function Home({ onSave, navigate }: Props) {
  const d = useHoard()
  const name = useRawState().profile.name
  const fmt = useFormat()
  const total = useCountUp(d.totalSaved)
  const monthSaved = useCountUp(d.month.saved)

  const claimable = d.quests.filter((q) => q.claimable)
  const shownQuests = useMemo(() => {
    const priority = [...d.quests].sort((a, b) => {
      if (a.claimable !== b.claimable) return a.claimable ? -1 : 1
      if (a.claimed !== b.claimed) return a.claimed ? 1 : -1
      return b.fraction - a.fraction
    })
    return priority.slice(0, 2)
  }, [d.quests])

  const claim = (id: string, xp: number) => {
    dispatch({ type: 'quest/claim', id, date: todayISO() })
    soundClaim()
    haptic([8, 24, 8])
    toast('Quest claimed', '📜', xp)
  }

  const rail = d.activeVaults.length > 0 ? d.activeVaults : d.completedVaults

  return (
    <div className="stack stack--lg">
      {/* ------------------------------------------------------------- crest */}
      <section className="crest rise">
        <Ring value={d.level.progress} size={72} stroke={7}
              label={`Level ${d.level.level}, ${Math.round(d.level.progress * 100)}% to next`}>
          <span className="crest__level">{d.level.level}</span>
          <span className="crest__lvl-label">LVL</span>
        </Ring>

        <div className="grow">
          <p className="tiny faint">Rank</p>
          <h1 className="crest__rank">
            <span aria-hidden>{d.rank.sigil}</span> {d.rank.name}
          </h1>
          <p className="tiny muted">
            {d.level.isMax
              ? 'Maximum rank — the hoard is legend'
              : <>{d.level.xpToNext.toLocaleString()} XP to level {d.level.level + 1}</>}
          </p>
        </div>

        <div className="crest__streak" title={`${d.streak.current} week streak`}>
          <span className={`crest__flame ${d.streak.current > 0 ? 'is-lit' : ''}`}>
            <IconFlame size={20} />
          </span>
          <span className="crest__streak-num">{d.streak.current}</span>
          <span className="tiny faint">{d.streak.current === 1 ? 'week' : 'weeks'}</span>
          {d.streak.freezes > 0 && (
            <span className="crest__freeze" title={`${d.streak.freezes} streak freeze banked`}>
              <IconSnow size={11} />{d.streak.freezes}
            </span>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- hero */}
      <section className="hero card card--pad-lg rise" style={{ animationDelay: '40ms' }}>
        <p className="tiny faint">{greeting(name)}</p>
        <p className="hero__total money">{fmt.money(total)}</p>
        <p className="small muted">
          in the hoard
          {d.totalWithdrawn > 0 && <> · {fmt.money(d.totalDeposited)} saved all time</>}
        </p>

        <div className="hero__month">
          <div className="row row--between">
            <span className="tiny faint">{d.month.label}</span>
            <span className="tiny">
              {d.month.target > 0
                ? <><span className="money">{fmt.money(monthSaved)}</span> <span className="faint">/ {fmt.money(d.month.target)}</span></>
                : <span className="money">{fmt.money(monthSaved)}</span>}
            </span>
          </div>
          {d.month.target > 0 ? (
            <>
              <Bar
                value={d.month.fraction}
                marker={d.month.expectedFraction}
                tall
                tone={d.month.hit ? 'good' : 'accent'}
                label="Monthly target progress"
              />
              <p className="tiny faint">
                {d.month.hit
                  ? '🎉 Monthly target smashed'
                  : d.month.onPace
                    ? `On pace · ${fmt.money(d.month.remaining)} left, ${d.month.daysLeft} days to go`
                    : `Behind pace · ${fmt.money(d.month.remaining)} left in ${d.month.daysLeft} days`}
              </p>
            </>
          ) : (
            <button className="btn btn--ghost btn--sm" onClick={() => navigate({ name: 'quests' })}>
              Set a monthly target
            </button>
          )}
        </div>

        <button className="btn btn--primary btn--block hero__cta" onClick={() => onSave(null)}>
          <IconPlus size={20} /> Save something
        </button>
      </section>

      {/* ------------------------------------------------------------ quests */}
      {shownQuests.length > 0 && (
        <section className="rise" style={{ animationDelay: '80ms' }}>
          <h2 className="section-title">
            Quests
            <button className="btn btn--bare tiny" onClick={() => navigate({ name: 'quests' })}>
              {claimable.length > 0 ? `${claimable.length} to claim` : 'See all'}
            </button>
          </h2>
          <ul className="stack stack--sm">
            {shownQuests.map((q) => (
              <QuestRow key={q.id} quest={q} money={fmt.money} onClaim={() => claim(q.id, q.xp)} />
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ vaults */}
      <section className="rise" style={{ animationDelay: '120ms' }}>
        <h2 className="section-title">
          Vaults
          <button className="btn btn--bare tiny" onClick={() => navigate({ name: 'vaults' })}>
            {rail.length > 0 ? 'See all' : 'Create one'}
          </button>
        </h2>

        {rail.length === 0 ? (
          <div className="card empty">
            <span className="empty__icon" aria-hidden>🗝️</span>
            <p className="empty__title">No vaults yet</p>
            <p className="small">A vault is a thing you're saving for — Christmas, a trip, a rainy day.</p>
            <button className="btn btn--primary btn--sm" onClick={() => navigate({ name: 'vaults' })}>
              Make your first vault
            </button>
          </div>
        ) : (
          <div className="stack stack--md">
            {rail.slice(0, 3).map((v) => (
              <VaultCard key={v.id} vault={v} money={fmt.money}
                         onOpen={() => navigate({ name: 'vault', vaultId: v.id })} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- activity */}
      {d.recent.length > 0 && (
        <section className="rise" style={{ animationDelay: '160ms' }}>
          <h2 className="section-title">Recent</h2>
          <ul className="card stack stack--sm">
            {d.recent.slice(0, 5).map((e) => {
              const v = e.vaultId ? d.vaultById.get(e.vaultId) : null
              return (
                <ActivityRow
                  key={e.id}
                  entry={e}
                  vaultName={v?.name ?? 'General hoard'}
                  vaultEmoji={v?.emoji ?? '🪙'}
                  money={fmt.money}
                  action={
                    <button
                      className="btn btn--bare btn--icon activity__del"
                      aria-label={`Delete this ${fmt.money(e.amount)} entry`}
                      onClick={() => {
                        dispatch({ type: 'entry/delete', id: e.id })
                        toast('Entry removed', '↩️')
                      }}
                    >
                      <IconTrash size={15} />
                    </button>
                  }
                />
              )
            })}
          </ul>
        </section>
      )}

      {!d.hasData && (
        <section className="card empty rise" style={{ animationDelay: '200ms' }}>
          <span className="empty__icon" aria-hidden><IconSpark size={38} /></span>
          <p className="empty__title">Your hoard starts at zero</p>
          <p className="small">
            Put something aside — even a fiver — and log it here. XP, streaks and ranks
            do the rest.
          </p>
        </section>
      )}
    </div>
  )
}
