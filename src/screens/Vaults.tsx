import { useState } from 'react'
import { useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { VaultCard } from '@/ui/parts'
import { IconPlus } from '@/ui/Icons'
import { VaultEditor } from './VaultEditor'
import type { Route } from '@/app/router'

type Filter = 'active' | 'done' | 'archived'

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
  const totalInVaults = d.vaults
    .filter((v) => !v.archived)
    .reduce((n, v) => n + v.saved, 0)

  return (
    <div className="stack stack--lg">
      <section className="card card--pad-lg">
        <div className="row row--between">
          <div>
            <p className="tiny faint">Across {d.activeVaults.length + d.completedVaults.length} vaults</p>
            <p className="hero__total hero__total--sm money">{fmt.money(totalInVaults)}</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
            <IconPlus size={16} /> New
          </button>
        </div>
        {d.generalSaved > 0 && (
          <p className="tiny faint">
            Plus {fmt.money(d.generalSaved)} in the general hoard, not tied to a vault.
          </p>
        )}
      </section>

      <div className="row row--tight row--wrap">
        {([['active', 'Active'], ['done', 'Complete'], ['archived', 'Archived']] as const).map(
          ([key, label]) => (
            <button
              key={key}
              className="chip"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label} {lists[key].length > 0 && <span className="faint">{lists[key].length}</span>}
            </button>
          ),
        )}
      </div>

      {list.length === 0 ? (
        <div className="card empty">
          <span className="empty__icon" aria-hidden>{filter === 'active' ? '🗝️' : filter === 'done' ? '🏆' : '📦'}</span>
          <p className="empty__title">
            {filter === 'active' ? 'No vaults on the go'
              : filter === 'done' ? 'Nothing finished yet'
              : 'Nothing archived'}
          </p>
          <p className="small">
            {filter === 'active'
              ? 'A vault is one thing you are saving for. Give it a target and a date and the app will tell you if you are on track.'
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
        <div className="stack stack--md">
          {list.map((v, i) => (
            <div key={v.id} className="rise" style={{ animationDelay: `${i * 35}ms` }}>
              <VaultCard vault={v} money={fmt.money}
                         onOpen={() => navigate({ name: 'vault', vaultId: v.id })} />
            </div>
          ))}
        </div>
      )}

      <VaultEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
