import { useMemo, useState } from 'react'
import { useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { Creature, nextStage, stageForLevel, stageName, STAGE_AT_LEVEL } from '@/ui/Creature'
import { AchievementTile, Notch } from '@/ui/parts'
import { Donut, Heatmap, MonthlyBars, SavingsArea, SpendBars, type Slice } from '@/charts/Charts'
import { cumulativeSeries, heatmap, monthlySeries } from '@/domain/stats'
import { weeklySpend } from '@/domain/budget'
import { FAMILY_LABEL, type AchFamily } from '@/domain/achievements'
import { RANKS } from '@/domain/xp'
import { formatMedium, formatMonthLabel } from '@/domain/dates'

const FAMILIES: AchFamily[] = ['first', 'volume', 'consistency', 'discipline', 'story']

export function Progress() {
  const d = useHoard()
  const fmt = useFormat()
  const [showAll, setShowAll] = useState(false)

  const cumulative = useMemo(() => cumulativeSeries(d.entries, d.today), [d.entries, d.today])
  const months = useMemo(() => monthlySeries(d.entries, 6, d.today), [d.entries, d.today])
  const heat = useMemo(() => heatmap(d.entries, 26, d.today), [d.entries, d.today])
  const spendWeeks = useMemo(() => weeklySpend(d.entries, 8, d.today), [d.entries, d.today])

  /**
   * Categorical colour follows the vault, never its rank in this list, so
   * filtering or reordering never repaints a vault the reader has learnt.
   * Past five, the tail folds into one Other slice rather than inventing hues.
   */
  const slices: Slice[] = useMemo(() => {
    const withMoney = d.vaults.filter((v) => v.saved > 0).sort((a, b) => b.saved - a.saved)
    const head = withMoney.slice(0, 5).map((v) => ({
      label: v.name, value: v.saved, color: `var(--t-${v.type})`,
    }))
    const tail = withMoney.slice(5).reduce((n, v) => n + v.saved, 0)
    const out = [...head]
    if (tail > 0) out.push({ label: 'Other vaults', value: tail, color: 'var(--ink-3)' })
    if (d.generalSaved > 0) out.push({ label: 'Bank', value: d.generalSaved, color: 'var(--ink-2)' })
    return out
  }, [d.vaults, d.generalSaved])

  const unlocked = d.achievements.filter((a) => a.unlocked)
  const visible = showAll ? d.achievements : d.achievements.filter((a) => a.unlocked || !a.hidden)
  const stage = stageForLevel(d.level.level)
  const evolvesAt = nextStage(d.level.level)

  if (!d.hasData) {
    return (
      <div className="panel empty">
        <p className="empty__title">Nothing to chart yet</p>
        <p className="small">Log a few deposits and this page fills with your own history.</p>
      </div>
    )
  }

  return (
    <div className="stack stack--lg">
      {/* ---------------------------------------------------- rank & companion */}
      <section className="panel">
        <header className="panel__head">
          <span className="label">Rank</span>
          <span className="tiny faint num">{d.xp.total.toLocaleString()} XP</span>
        </header>
        <div className="panel__body rankcard">
          <div className="rankcard__art" style={{ color: 'var(--accent)' }}>
            <Creature stage={stage} size={80} title={`${stageName(stage)}, your companion`} />
          </div>
          <div className="grow stack stack--sm">
            <div>
              <h2 className="rankcard__name">{d.rank.name}</h2>
              <p className="tiny faint num">Level {d.level.level} · {stageName(stage)}</p>
            </div>
            <p className="small muted">{d.rank.blurb}</p>
            <Notch value={d.level.progress} cells={12} thin label="Progress to the next level" />
            <p className="tiny faint num">
              {d.level.isMax
                ? 'Maximum level'
                : `${d.level.xpToNext.toLocaleString()} XP to level ${d.level.level + 1}`}
              {evolvesAt && ` · evolves at level ${evolvesAt.level}`}
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- XP sources */}
      <section className="panel">
        <header className="panel__head"><span className="label">Where your XP came from</span></header>
        <div className="panel__body stack stack--sm">
          {([
            ['Deposits', d.xp.deposits],
            ['Streak weeks', d.xp.streak],
            ['Quests', d.xp.quests],
            ['Vaults filled', d.xp.vaults],
            ['Monthly goals', d.xp.monthly],
            ['Badges', d.xp.achievements],
          ] as const)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => (
              <div key={label} className="xprow">
                <span className="grow small">{label}</span>
                <span className="xprow__bar">
                  <Notch value={value / Math.max(1, d.xp.total)} cells={8} thin label={label} />
                </span>
                <span className="tiny faint num xprow__val">{value.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- charts */}
      <SavingsArea points={cumulative} money={fmt.compact} total={d.totalSaved} />
      <MonthlyBars points={months} money={fmt.compact} target={d.month.target || undefined} />
      {d.totalSpent > 0 && (
        <SpendBars weeks={spendWeeks} limit={d.budget.limit} money={fmt.compact} />
      )}
      <Heatmap grid={heat} money={fmt.money} />
      <Donut slices={slices} money={fmt.money} />

      {/* ------------------------------------------------------------ records */}
      <section className="panel">
        <header className="panel__head"><span className="label">Personal records</span></header>
        <div className="grid grid--2">
          <Record label="Longest streak" value={`${d.streak.longest} ${d.streak.longest === 1 ? 'week' : 'weeks'}`} />
          <Record label="Active days" value={String(d.streak.activeDays)} />
          <Record label="Best week" value={d.records.bestWeek ? fmt.money(d.records.bestWeek.value) : '—'} />
          <Record label="Best month" value={d.records.bestMonth ? fmt.money(d.records.bestMonth.value) : '—'}
                  sub={d.records.bestMonth ? formatMonthLabel(d.records.bestMonth.key) : undefined} />
          <Record label="Biggest single save"
                  value={d.records.biggestSingle ? fmt.money(d.records.biggestSingle.amount) : '—'} />
          <Record label="Deposits logged" value={String(d.records.totalDeposits)} />
          <Record label="Average deposit" value={fmt.money(d.records.averageDeposit)} />
          <Record label="Saving since"
                  value={d.records.firstEntry ? formatMedium(d.records.firstEntry) : '—'} />
        </div>
      </section>

      {/* ------------------------------------------------------------- badges */}
      <section className="section">
        <div className="section__head">
          <span className="label">Badges</span>
          <span className="tiny faint num">{unlocked.length} / {d.achievements.length}</span>
        </div>
        <Notch value={unlocked.length / d.achievements.length} cells={20} thin label="Badges earned" />

        {FAMILIES.map((family) => {
          const list = visible.filter((a) => a.family === family)
          if (list.length === 0) return null
          return (
            <div key={family} className="stack stack--sm achgroup">
              <span className="tiny faint">{FAMILY_LABEL[family]}</span>
              <ul className="achgrid">
                {list.map((a) => <AchievementTile key={a.id} badge={a} />)}
              </ul>
            </div>
          )
        })}

        <button className="btn btn--block btn--sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide locked secrets' : 'Show hidden badges'}
        </button>
      </section>

      {/* --------------------------------------------------- the two ladders */}
      <section className="panel">
        <header className="panel__head"><span className="label">Rank ladder</span></header>
        <ul className="ladder">
          {RANKS.map((r) => {
            const reached = d.level.level >= r.minLevel
            return (
              <li key={r.key} className={`ladder__row ${reached ? 'is-reached' : ''}`}>
                <span className="ladder__lv num">{r.minLevel}</span>
                <span className="grow small">{r.name}</span>
                <span className="tiny faint">
                  {reached ? 'Reached' : `${r.minLevel - d.level.level} to go`}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <header className="panel__head"><span className="label">Evolution line</span></header>
        <ul className="evoline">
          {STAGE_AT_LEVEL.map((s) => {
            const reached = d.level.level >= s.level
            return (
              <li key={s.name} className={`evoline__item ${reached ? 'is-reached' : ''}`}>
                <span className="evoline__art" style={{ color: reached ? 'var(--accent)' : 'var(--ink-3)' }}>
                  <Creature stage={s.stage} size={44} />
                </span>
                <span className="tiny">{s.name}</span>
                <span className="tiny faint num">Lv {s.level}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Record({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <span className="grid__value num">{value}</span>
      {sub && <span className="tiny faint">{sub}</span>}
    </div>
  )
}
