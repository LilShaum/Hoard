import { useMemo, useState } from 'react'
import { useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { Ring } from '@/ui/Ring'
import { Bar } from '@/ui/Bar'
import { AchievementTile } from '@/ui/parts'
import { AreaChart, BarChart, Donut, Heatmap, type Slice } from '@/charts/Charts'
import { cumulativeSeries, heatmap, monthlySeries } from '@/domain/stats'
import { FAMILY_LABEL, type AchFamily } from '@/domain/achievements'
import { RANKS } from '@/domain/xp'
import { formatMedium, formatMonthLabel } from '@/domain/dates'
import { IconLock } from '@/ui/Icons'

const FAMILIES: AchFamily[] = ['first', 'volume', 'consistency', 'discipline', 'story']

export function Progress() {
  const d = useHoard()
  const fmt = useFormat()
  const [showAll, setShowAll] = useState(false)

  const cumulative = useMemo(() => cumulativeSeries(d.entries, d.today), [d.entries, d.today])
  const months = useMemo(() => monthlySeries(d.entries, 6, d.today), [d.entries, d.today])
  const heat = useMemo(() => heatmap(d.entries, 26, d.today), [d.entries, d.today])

  const slices: Slice[] = useMemo(() => {
    const list: Slice[] = d.vaults
      .filter((v) => v.saved > 0)
      .sort((a, b) => b.saved - a.saved)
      .slice(0, 6)
      .map((v) => ({ label: v.name, value: v.saved, color: `var(--a-${v.color})`, emoji: v.emoji }))
    if (d.generalSaved > 0) {
      list.push({ label: 'General hoard', value: d.generalSaved, color: 'var(--a-slate)', emoji: '🪙' })
    }
    return list
  }, [d.vaults, d.generalSaved])

  const unlocked = d.achievements.filter((a) => a.unlocked)
  const visible = showAll ? d.achievements : d.achievements.filter((a) => a.unlocked || !a.hidden)

  if (!d.hasData) {
    return (
      <div className="card empty">
        <span className="empty__icon" aria-hidden>📈</span>
        <p className="empty__title">Nothing to chart yet</p>
        <p className="small">Log a few deposits and this page fills with your own history.</p>
      </div>
    )
  }

  return (
    <div className="stack stack--lg">
      {/* -------------------------------------------------------------- rank */}
      <section className="card card--pad-lg rankcard">
        <Ring value={d.level.progress} size={92} stroke={9}>
          <span className="rankcard__sigil" aria-hidden>{d.rank.sigil}</span>
        </Ring>
        <div className="grow">
          <p className="tiny faint">Level {d.level.level} · {d.xp.total.toLocaleString()} XP</p>
          <h2 className="rankcard__name">{d.rank.name}</h2>
          <p className="small muted">{d.rank.blurb}</p>
          {d.nextRank && (
            <p className="tiny faint">
              <IconLock size={11} className="inline-icon" /> {d.nextRank.name} at level {d.nextRank.minLevel}
            </p>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- XP sources */}
      <section className="card stack stack--sm">
        <h2 className="section-title">Where your XP came from</h2>
        {([
          ['Deposits', d.xp.deposits],
          ['Streak weeks', d.xp.streak],
          ['Quests', d.xp.quests],
          ['Vaults filled', d.xp.vaults],
          ['Monthly targets', d.xp.monthly],
          ['Achievements', d.xp.achievements],
        ] as const)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => (
            <div key={label} className="xprow">
              <span className="grow small">{label}</span>
              <Bar value={value / Math.max(1, d.xp.total)} thin className="xprow__bar" />
              <span className="tiny faint xprow__val">{value.toLocaleString()}</span>
            </div>
          ))}
      </section>

      {/* ------------------------------------------------------------ charts */}
      <section className="card">
        <h2 className="section-title">Total saved<span className="money faint">{fmt.money(d.totalSaved)}</span></h2>
        <AreaChart points={cumulative} money={fmt.compact} />
      </section>

      <section className="card">
        <h2 className="section-title">
          Month by month
          {d.month.target > 0 && <span className="faint">target {fmt.compact(d.month.target)}</span>}
        </h2>
        <BarChart points={months} money={fmt.compact} target={d.month.target || undefined} />
      </section>

      <section className="card">
        <h2 className="section-title">Saving days<span className="faint">last 26 weeks</span></h2>
        <Heatmap grid={heat} money={fmt.money} />
      </section>

      {slices.length > 1 && (
        <section className="card">
          <h2 className="section-title">Where it sits</h2>
          <Donut slices={slices} money={fmt.money} />
        </section>
      )}

      {/* ----------------------------------------------------------- records */}
      <section>
        <h2 className="section-title">Personal records</h2>
        <div className="records">
          <Record label="Longest streak" value={`${d.streak.longest} ${d.streak.longest === 1 ? 'week' : 'weeks'}`} />
          <Record label="Active days" value={String(d.streak.activeDays)} />
          <Record label="Best week" value={d.records.bestWeek ? fmt.money(d.records.bestWeek.value) : '—'} />
          <Record
            label="Best month"
            value={d.records.bestMonth ? fmt.money(d.records.bestMonth.value) : '—'}
            sub={d.records.bestMonth ? formatMonthLabel(d.records.bestMonth.key) : undefined}
          />
          <Record label="Biggest single save" value={d.records.biggestSingle ? fmt.money(d.records.biggestSingle.amount) : '—'} />
          <Record label="Deposits logged" value={String(d.records.totalDeposits)} />
          <Record label="Average deposit" value={fmt.money(d.records.averageDeposit)} />
          <Record label="Saving since" value={d.records.firstEntry ? formatMedium(d.records.firstEntry) : '—'} />
        </div>
      </section>

      {/* ------------------------------------------------------ achievements */}
      <section>
        <h2 className="section-title">
          Achievements
          <span className="faint">{unlocked.length} / {d.achievements.length}</span>
        </h2>
        <Bar value={unlocked.length / d.achievements.length} thin className="achbar" />

        {FAMILIES.map((family) => {
          const list = visible.filter((a) => a.family === family)
          if (list.length === 0) return null
          return (
            <div key={family} className="stack stack--sm achgroup">
              <p className="tiny faint">{FAMILY_LABEL[family]}</p>
              <ul className="achgrid">
                {list.map((a) => <AchievementTile key={a.id} badge={a} />)}
              </ul>
            </div>
          )
        })}

        <button className="btn btn--ghost btn--block btn--sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide locked secrets' : 'Show hidden achievements'}
        </button>
      </section>

      {/* ------------------------------------------------------- rank ladder */}
      <section className="card">
        <h2 className="section-title">The ladder</h2>
        <ul className="ladder">
          {RANKS.map((r) => {
            const reached = d.level.level >= r.minLevel
            return (
              <li key={r.key} className={`ladder__row ${reached ? 'is-reached' : ''}`}>
                <span className="ladder__sigil" aria-hidden>{r.sigil}</span>
                <span className="grow">
                  <strong className="small">{r.name}</strong>
                  <span className="tiny faint"> · level {r.minLevel}</span>
                </span>
                {reached
                  ? <span className="badge badge--good">Reached</span>
                  : <span className="tiny faint">{(d.level.level >= r.minLevel - 2) ? 'Almost' : `${r.minLevel - d.level.level} levels`}</span>}
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
    <div className="record card">
      <span className="tiny faint">{label}</span>
      <strong className="record__value money">{value}</strong>
      {sub && <span className="tiny faint">{sub}</span>}
    </div>
  )
}
