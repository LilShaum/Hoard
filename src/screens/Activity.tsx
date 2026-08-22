import { useMemo, useState } from 'react'
import { dispatch, useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { ActivityRow } from '@/ui/parts'
import { IconBack, IconTrash } from '@/ui/Icons'
import { formatMonthLabel, monthKey } from '@/domain/dates'
import { depositsOf, signed, spendOf, withdrawalsOf } from '@/domain/stats'
import { toast } from '@/ui/toast'
import type { Entry } from '@/domain/types'
import type { Route } from '@/app/router'

type Filter = 'all' | 'in' | 'out' | 'spend'

/**
 * The full ledger. Without it, money logged straight to the Bank is
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
      .filter((e) => (
        filter === 'all' ? true
        : filter === 'in' ? e.kind === 'deposit'
        : filter === 'out' ? e.kind === 'withdrawal'
        : e.kind === 'spend'))
      .filter((e) => (
        source === 'all' ? true
        : source === 'spend' ? e.kind === 'spend'
        : source === 'general' ? e.vaultId == null && e.kind !== 'spend'
        : e.vaultId === source))
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
    toast(`${fmt.money(amount)} entry removed`)
  }

  const sources: Array<{ key: string; label: string }> = [
    { key: 'all', label: 'Everything' },
    { key: 'general', label: 'Bank' },
    { key: 'spend', label: 'Spending' },
    ...d.vaults.filter((v) => v.entryCount > 0).map((v) => ({ key: v.id, label: v.name })),
  ]

  return (
    <div className="stack stack--lg">
      <div className="row row--between">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate({ name: 'home' })}>
          <IconBack size={16} /> Home
        </button>
        <span className="tiny faint">{filtered.length} of {d.entries.length}</span>
      </div>

      <section className="panel panel__body">
        <span className="label">All activity</span>
        <p className="num--hero hoard__total">{fmt.money(d.totalSaved)}</p>
        <p className="tiny faint num">
          +{fmt.money(depositsOf(filtered))} saved · −{fmt.money(withdrawalsOf(filtered))} withdrawn
          · {fmt.money(spendOf(filtered))} spent
        </p>
      </section>

      <div className="stack stack--sm">
        <div className="row row--tight row--wrap">
          {([['all', 'All'], ['in', 'Saved'], ['out', 'Withdrawn'], ['spend', 'Spent']] as const)
            .map(([key, label]) => (
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
        <div className="panel empty">
          <p className="empty__title">Nothing here</p>
          <p className="small">No entries match those filters.</p>
        </div>
      ) : (
        months.map(([key, list]) => {
          const net = list.reduce((n, e) => n + signed(e), 0)
          return (
            <section key={key} className="section">
              <div className="section__head">
                <span className="label">{formatMonthLabel(key)}</span>
                <span className="num tiny faint">{fmt.money(net, { signed: true })}</span>
              </div>
              <ul className="panel activity-list">
                {list.map((e) => {
                  const v = e.vaultId ? d.vaultById.get(e.vaultId) : null
                  return (
                    <ActivityRow
                      key={e.id}
                      entry={e}
                      vaultName={v?.name ?? (e.kind === 'spend' ? 'Spending' : 'Bank')}
                      glyph={v?.glyph ?? (e.kind === 'spend' ? 'bag' : 'coin')}
                      type={v?.type ?? null}
                      money={fmt.money}
                      action={
                        <button
                          className="btn btn--icon activity__del"
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
