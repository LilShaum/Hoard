import { useMemo } from 'react'
import { dispatch, useHoard, useRawState } from '@/store/store'
import { useFormat } from '@/app/format'
import { useCountUp } from '@/ui/useCountUp'
import { Creature, stageForLevel, stageName } from '@/ui/Creature'
import { Notch, Meter, Status, VaultCard, QuestRow, ActivityRow } from '@/ui/parts'
import { IconPlus } from '@/ui/Icons'
import { WeekSpark } from '@/charts/Charts'
import { BUDGET_LABEL } from '@/domain/budget'
import { formatWeekday, isoWeekKey, plural, todayISO } from '@/domain/dates'
import { toast } from '@/ui/toast'
import { haptic, soundClaim } from '@/ui/feedback'
import { makeTransfer } from '@/store/reducer'
import type { Route } from '@/app/router'

type Props = {
  onLog: (vaultId?: string | null) => void
  navigate: (r: Route) => void
}

function greeting(name: string): string {
  const h = new Date().getHours()
  const part = h < 5 ? 'Still up' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
  return name ? `${part}, ${name}` : part
}

export function Home({ onLog, navigate }: Props) {
  const d = useHoard()
  const name = useRawState().profile.name
  const fmt = useFormat()
  const total = useCountUp(d.totalSaved)
  const stage = stageForLevel(d.level.level)

  const shownQuests = useMemo(
    () => [...d.quests]
      .sort((a, b) => {
        if (a.claimable !== b.claimable) return a.claimable ? -1 : 1
        if (a.claimed !== b.claimed) return a.claimed ? 1 : -1
        return b.fraction - a.fraction
      })
      .slice(0, 2),
    [d.quests],
  )

  const claim = (id: string, xp: number) => {
    dispatch({ type: 'quest/claim', id, date: todayISO() })
    soundClaim()
    haptic([8, 24, 8])
    toast('Quest claimed', xp)
  }

  const rail = d.activeVaults.length > 0 ? d.activeVaults : d.completedVaults
  const budgetTone = d.budget.status === 'over' ? 'bad' : d.budget.status === 'close' ? 'warn' : 'good'

  const distribute = () => {
    const today = todayISO()
    const entries = d.bankPlan.allocations
      .flatMap((a) => makeTransfer(a.vaultId, a.amount, today, 'Weekly split from the Bank'))
    dispatch({ type: 'entries/add', entries })
    dispatch({ type: 'bank/distributed', week: isoWeekKey(today) })
    soundClaim()
    haptic([8, 24, 8])
    toast(`Sent to ${plural(d.bankPlan.allocations.length, 'vault')}`)
  }

  return (
    <div className="stack stack--lg">
      {/* ---------------------------------------------------------- companion */}
      <section className="panel companion">
        <div className="companion__art" style={{ color: 'var(--accent)' }}>
          <Creature stage={stage} size={62} title={`${stageName(stage)}, your companion`} />
        </div>
        <div className="grow">
          <p className="label">{greeting(name)}</p>
          <h2 className="companion__rank">{d.rank.name}</h2>
          <p className="tiny faint">
            <span className="num">Lv {d.level.level}</span> · {stageName(stage)}
            {!d.level.isMax && (
              <> · <span className="num">{d.level.xpToNext.toLocaleString()}</span> XP to go</>
            )}
          </p>
        </div>
        <div className="companion__streak">
          <span className="num companion__streak-num">{d.streak.current}</span>
          <span className="label">{d.streak.current === 1 ? 'week' : 'weeks'}</span>
          {d.streak.freezes > 0 && (
            <span className="tiny faint num" title="Streak freezes banked">
              {d.streak.freezes} held
            </span>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- hoard */}
      <section className="panel">
        <header className="panel__head">
          <span className="label">The hoard</span>
          <span className="tiny faint num">{fmt.money(d.totalDeposited)} all time</span>
        </header>

        <div className="panel__body stack stack--md">
          <p className="num--hero hoard__total">{fmt.money(total)}</p>

          <div className="stack stack--sm">
            <div className="row row--between">
              <span className="label">{d.month.label} deposit goal</span>
              <span className="tiny num">
                {d.month.target > 0
                  ? <>{fmt.money(d.month.saved)} <span className="faint">/ {fmt.money(d.month.target)}</span></>
                  : fmt.money(d.month.saved)}
              </span>
            </div>

            {d.month.target > 0 ? (
              <>
                <Notch
                  value={d.month.fraction}
                  marker={d.month.expectedFraction}
                  color={d.month.hit ? 'var(--good)' : undefined}
                  tall
                  label="Monthly deposit goal"
                />
                <p className="tiny faint">
                  {d.month.hit
                    ? 'Goal met — everything from here is a bonus.'
                    : d.month.onPace
                      ? `Ahead of an even pace. ${fmt.money(d.month.remaining)} left, ${plural(d.month.daysLeft, 'day')} to go.`
                      : `Behind an even pace. ${fmt.money(d.month.remaining)} left in ${plural(d.month.daysLeft, 'day')}.`}
                </p>
              </>
            ) : (
              <button className="btn btn--sm" onClick={() => navigate({ name: 'quests' })}>
                Set a monthly deposit goal
              </button>
            )}
          </div>

          <button className="btn btn--primary btn--block" onClick={() => onLog(null)}>
            <IconPlus size={17} /> Log something
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------------- bank */}
      {(d.generalSaved > 0 || d.bankPlan.needed > 0) && (
        <section className="panel">
          <header className="panel__head">
            <span className="label">Bank</span>
            <span className="tiny faint num">{fmt.money(d.generalSaved)} unsplit</span>
          </header>
          <div className="panel__body stack stack--md">
            {d.offerDistribution ? (
              <>
                <p className="small muted">
                  This week's split is ready: {fmt.money(d.bankPlan.total)} into{' '}
                  {plural(d.bankPlan.allocations.length, 'vault')}.
                </p>
                <ul className="stack stack--sm">
                  {d.bankPlan.allocations.map((a) => (
                    <li key={a.vaultId} className="row row--between tiny">
                      <span>
                        {a.name}
                        {a.catchUp && <span className="faint"> · past due, catching up</span>}
                      </span>
                      <span className="num">
                        {fmt.money(a.amount)}{a.short && <span className="faint"> of {fmt.money(a.needPerWeek)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <button className="btn btn--primary btn--block" onClick={distribute}>
                  Send to vaults
                </button>
                {d.bankPlan.covered ? (
                  <p className="tiny faint">
                    Enough in the Bank for <span className="num">{d.bankRunway}</span>{' '}
                    {d.bankRunway === 1 ? 'more week' : 'more weeks'} at this rate.
                  </p>
                ) : (
                  <p className="tiny faint">
                    The Bank can't cover the full week — the nearest deadlines go first.
                  </p>
                )}
              </>
            ) : d.bankPlan.empty ? (
              <p className="small muted">
                Give a vault a target and a deadline, and this is where Hoard works out
                what it needs each week.
              </p>
            ) : d.generalSaved <= 0 ? (
              <p className="small muted">
                Your vaults need {fmt.money(d.bankPlan.needed)} a week and the Bank is
                dry — deposit here and it'll be ready to split.
              </p>
            ) : (
              <p className="small muted">
                {fmt.money(d.distributedThisWeek)} went out to your vaults this week.
                The next split unlocks Monday, with <span className="num">{d.bankRunway}</span>{' '}
                {d.bankRunway === 1 ? 'week' : 'weeks'} still covered.
              </p>
            )}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- this week */}
      <section className="panel">
        <header className="panel__head">
          <span className="label">This week</span>
          {d.budget.limit > 0 && (
            <Status tone={budgetTone}>{BUDGET_LABEL[d.budget.status]}</Status>
          )}
        </header>

        {d.budget.limit > 0 ? (
          <>
            <div className="panel__body stack stack--md">
              <div className="safe">
                <span className="label">Safe to spend today</span>
                <p className="num safe__figure">{fmt.money(d.budget.safePerDay)}</p>
                <p className="tiny faint">
                  <span className="num">{fmt.money(d.budget.remaining)}</span> left over{' '}
                  {d.budget.daysLeft} {d.budget.daysLeft === 1 ? 'day' : 'days'}
                </p>
              </div>

              <div className="stack stack--sm">
                <div className="row row--between">
                  <span className="tiny faint num">{fmt.money(d.budget.spent)} spent</span>
                  <span className="tiny faint num">limit {fmt.money(d.budget.limit)}</span>
                </div>
                <Meter
                  value={d.budget.fraction}
                  color={d.budget.status === 'over' ? 'var(--bad)'
                       : d.budget.status === 'close' ? 'var(--warn)' : 'var(--good)'}
                  label="Weekly spending against the limit"
                />
              </div>

              <WeekSpark perDay={d.budget.perDay} limit={d.budget.limit} money={fmt.money} />
            </div>

            {d.budget.streak > 0 && (
              <footer className="panel__foot tiny faint">
                <span className="num">{d.budget.streak}</span>{' '}
                {d.budget.streak === 1 ? 'week' : 'weeks'} running under the limit
              </footer>
            )}
          </>
        ) : (
          <div className="panel__body stack stack--sm">
            <p className="small muted">
              A weekly spending limit is the other half of saving: most months miss the
              deposit goal because of what left the current account, not what failed to
              arrive.
            </p>
            <button className="btn btn--sm" onClick={() => navigate({ name: 'quests' })}>
              Set a weekly spending limit
            </button>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ quests */}
      {shownQuests.length > 0 && (
        <section className="section">
          <div className="section__head">
            <span className="label">Quests</span>
            <button className="btn btn--link" onClick={() => navigate({ name: 'quests' })}>
              All quests
            </button>
          </div>
          <ul className="stack stack--sm">
            {shownQuests.map((q) => (
              <QuestRow key={q.id} quest={q} money={fmt.money} onClaim={() => claim(q.id, q.xp)} />
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------ vaults */}
      <section className="section">
        <div className="section__head">
          <span className="label">Vaults</span>
          <button className="btn btn--link" onClick={() => navigate({ name: 'vaults' })}>
            {rail.length > 0 ? 'All vaults' : 'Create one'}
          </button>
        </div>

        {rail.length === 0 ? (
          <div className="panel empty">
            <p className="empty__title">No vaults yet</p>
            <p className="small">
              A vault is one thing you are saving for. Give it a target and a date and
              Hoard will tell you honestly whether you are on track.
            </p>
            <button className="btn btn--primary btn--sm" onClick={() => navigate({ name: 'vaults' })}>
              Open your first vault
            </button>
          </div>
        ) : (
          <div className="stack stack--sm">
            {rail.slice(0, 3).map((v) => (
              <VaultCard key={v.id} vault={v} money={fmt.money}
                         onOpen={() => navigate({ name: 'vault', vaultId: v.id })} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- activity */}
      {d.recent.length > 0 && (
        <section className="section">
          <div className="section__head">
            <span className="label">Recent</span>
            <button className="btn btn--link" onClick={() => navigate({ name: 'activity' })}>
              Full ledger
            </button>
          </div>
          <ul className="panel activity-list">
            {d.recent.slice(0, 5).map((e) => {
              const v = e.vaultId ? d.vaultById.get(e.vaultId) : null
              return (
                <ActivityRow
                  key={e.id}
                  entry={e}
                  vaultName={v?.name ?? (e.kind === 'spend' ? 'Spending' : 'Bank')}
                  glyph={v?.glyph ?? (e.kind === 'spend' ? 'bag' : 'coin')}
                  type={v?.type ?? null}
                  money={fmt.money}
                />
              )
            })}
          </ul>
        </section>
      )}

      {!d.hasData && (
        <section className="panel empty">
          <p className="empty__title">Your hoard starts at zero</p>
          <p className="small">
            Put something aside — even a fiver — and log it. Levels, streaks and ranks
            do the rest. {formatWeekday(d.today)} is as good a day as any.
          </p>
        </section>
      )}
    </div>
  )
}
