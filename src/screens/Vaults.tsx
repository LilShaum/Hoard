import { useState } from 'react'
import { useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { VaultCard } from '@/ui/parts'
import { IconPlus } from '@/ui/Icons'
import { VaultEditor } from './VaultEditor'
import type { Route } from '@/app/router'

type Filter = 'active' | 'done' | 'archived'

const FILTERS: Array<[Filter, string]> = [
  ['active', 'Active'], ['done', 'Complete'], ['archived', 'Archived'],
]

export function Vaults({ navigate }: { navigate: (r: Route) => void }) {
  const d = useHoard()
  const fmt = useFormat()
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState<Filter>('active')

  const lists: Record<Filter, typeof d.vaults> = {
    active: d.activeVaults,
    done: d.completedVaults,
    archived: d.archivedVaults,
  }
  const list = lists[filter]
  const inVaults = d.vaults.filter((v) => !v.archived).reduce((n, v) => n + v.saved, 0)

  return (
    <div className="stack stack--lg">
      <section className="panel">
        <header className="panel__head">
          <span className="label">Held in vaults</span>
          <button className="btn btn--sm" onClick={() => setCreating(true)}>
            <IconPlus size={14} /> New vault
          </button>
        </header>
        <div className="panel__body">
          <p className="num--hero hoard__total">{fmt.money(inVaults)}</p>
          <p className="tiny faint">
            Across {d.activeVaults.length + d.completedVaults.length}{' '}
            {d.activeVaults.length + d.completedVaults.length === 1 ? 'vault' : 'vaults'}
          </p>
        </div>
        {d.generalSaved > 0 && (
          <footer className="panel__foot">
            <button className="btn btn--link" onClick={() => navigate({ name: 'activity' })}>
              Plus {fmt.money(d.generalSaved)} in the Bank
            </button>
          </footer>
        )}
      </section>

      <div className="seg seg--wrap" role="group" aria-label="Filter vaults">
        {FILTERS.map(([key, label]) => (
          <button key={key} className="seg__opt" aria-pressed={filter === key}
                  onClick={() => setFilter(key)}>
            {label} <span className="num faint">{lists[key].length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="panel empty">
          <p className="empty__title">
            {filter === 'active' ? 'No vaults on the go'
              : filter === 'done' ? 'Nothing finished yet'
              : 'Nothing archived'}
          </p>
          <p className="small">
            {filter === 'active'
              ? 'A vault is one thing you are saving for. Give it a target and a date and Hoard works out what you need each week.'
              : filter === 'done'
                ? 'Fill a vault to its target and it lands here.'
                : 'Vaults you archive are kept here with their history intact.'}
          </p>
          {filter === 'active' && (
            <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
              Open a vault
            </button>
          )}
        </div>
      ) : (
        <div className="stack stack--sm">
          {list.map((v) => (
            <VaultCard key={v.id} vault={v} money={fmt.money}
                       onOpen={() => navigate({ name: 'vault', vaultId: v.id })} />
          ))}
        </div>
      )}

      <VaultEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
