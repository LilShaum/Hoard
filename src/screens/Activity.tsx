import { useMemo, useState } from 'react'
import { dispatch, useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { ActivityRow } from '@/ui/parts'
import { IconBack, IconTrash } from '@/ui/Icons'
import { formatMonthLabel, monthKey } from '@/domain/dates'
import { depositsOf, withdrawalsOf } from '@/domain/stats'
import { toast } from '@/ui/toast'
import type { Entry } from '@/domain/types'
import type { Route } from '@/app/router'

type Filter = 'all' | 'in' | 'out'

/**
 * The full ledger. Without it, money logged straight to the general hoard is
 * visible as a number but its individual entries are unreachable — you can see
 * the total and never find the mistake inside it.
 */
export function Activity({ navigate }: { navigate: (r: Route) => void }) {
  const d = useHoard()
  const fmt = useFormat()
  const [filter, setFilter] = useState<Filter>('all')
  const [source, setSource] = useState<string>('all')

  const filtered = useMemo(() => {
    return d.entries
      .filter((e) => (filter === 'all' ? true : filter === 'in' ? e.kind === 'deposit' : e.kind === 'withdrawal'))
      .filter((e) => (source === 'all' ? true : source === 'general' ? e.vaultId == null : e.vaultId === source))
      .slice()
      .reverse()
  }, [d.entries, filter, source])

  const months = useMemo(() => {
    const groups = new Map<string, Entry[]>()
    for (const e of filtered) {
      const k = monthKey(e.date)
      const list = groups.get(k)
      if (list) list.push(e)
      else groups.set(k, [e])
    }
    return [...groups.entries()]
  }, [filtered])

  const remove = (id: string, amount: number) => {
    dispatch({ type: 'entry/delete', id })
    toast(`${fmt.money(amount)} entry removed`, '↩️')
  }

  const sources: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'Everything' },
    { key: 'general', label: '🪙 General hoard' },
    ...d.vaults.filter((v) => v.entryCount > 0).map((v) => ({ key: v.id, label: `${v.emoji} ${v.name}` })),
  ]

  return (
    <div className="stack stack--lg">
      <div className="row row--between">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate({ name: 'home' })}>
          <IconBack size={16} /> Home
        </button>
        <span className="tiny faint">{filtered.length} of {d.entries.length}</span>
      </div>

      <section className="card card--pad-lg">
        <p className="tiny faint">All activity</p>
        <p className="hero__total hero__total--sm money">{fmt.money(d.totalSaved)}</p>
        <p className="small muted">
          <span style={{ color: 'var(--good)' }}>+{fmt.money(depositsOf(filtered))} in</span>
          {' · '}
          <span style={{ color: 'var(--bad)' }}>−{fmt.money(withdrawalsOf(filtered))} out</span>
        </p>
      </section>

      <div className="stack stack--sm">
        <div className="row row--tight row--wrap">
          {([['all', 'All'], ['in', 'Money in'], ['out', 'Money out']] as const).map(([key, label]) => (
            <button key={key} className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row row--tight row--wrap">
          {sources.map((s) => (
            <button key={s.key} className="chip" aria-pressed={source === s.key} onClick={() => setSource(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {months.length === 0 ? (
        <div className="card empty">
          <span className="empty__icon" aria-hidden>🔍</span>
          <p className="empty__title">Nothing here</p>
          <p className="small">No entries match those filters.</p>
        </div>
      ) : (
        months.map(([key, list]) => {
          const net = list.reduce((n, e) => n + (e.kind === 'deposit' ? e.amount : -e.amount), 0)
          return (
            <section key={key}>
              <h2 className="section-title">
                {formatMonthLabel(key)}
                <span className="money faint">{fmt.money(net, { signed: true })}</span>
              </h2>
              <ul className="card stack stack--sm">
                {list.map((e) => {
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
                          onClick={() => remove(e.id, e.amount)}
                        >
                          <IconTrash size={15} />
                        </button>
                      }
                    />
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
