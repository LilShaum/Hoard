import { useMemo, useState } from 'react'
import { dispatch, useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { Ring } from '@/ui/Ring'
import { Sheet } from '@/ui/Sheet'
import { ActivityRow, PaceBadge } from '@/ui/parts'
import { IconBack, IconEdit, IconPlus, IconTrash } from '@/ui/Icons'
import { VaultEditor } from './VaultEditor'
import { VaultProjection } from '@/charts/VaultProjection'
import { simulate, suggestedPerWeek } from '@/domain/pace'
import { formatCountdown, formatMedium, todayISO } from '@/domain/dates'
import { toast } from '@/ui/toast'
import { haptic } from '@/ui/feedback'
import type { Route } from '@/app/router'

type Props = {
  vaultId: string
  navigate: (r: Route) => void
  onSave: (vaultId?: string | null) => void
}

/** Slider positions are geometric — one drag should span $5/wk to $500/wk. */
function sliderToCents(pos: number, anchor: number): number {
  const min = Math.max(100, anchor / 8)
  const max = Math.max(min * 2, anchor * 6)
  const value = min * Math.pow(max / min, pos)
  return Math.max(100, Math.round(value / 100) * 100)
}

export function VaultDetail({ vaultId, navigate, onSave }: Props) {
  const d = useHoard()
  const fmt = useFormat()
  const vault = d.vaultById.get(vaultId)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pos, setPos] = useState(0.5)

  const anchor = useMemo(() => (vault ? suggestedPerWeek(vault.pace) : 2000), [vault])
  const perWeek = sliderToCents(pos, anchor)
  const whatIf = useMemo(
    () => (vault ? simulate(vault.pace, perWeek, todayISO()) : null),
    [vault, perWeek])

  if (!vault) {
    return (
      <div className="card empty">
        <span className="empty__icon" aria-hidden>🔍</span>
        <p className="empty__title">That vault is gone</p>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate({ name: 'vaults' })}>
          Back to vaults
        </button>
      </div>
    )
  }

  const { pace } = vault
  const accent = `var(--a-${vault.color})`

  const remove = () => {
    dispatch({ type: 'vault/delete', id: vault.id })
    toast(`${vault.name} deleted — its money moved to the general hoard`, '🗑️')
    haptic(20)
    navigate({ name: 'vaults' })
  }

  const toggleArchive = () => {
    dispatch({ type: 'vault/update', id: vault.id, patch: { archived: !vault.archived } })
    toast(vault.archived ? `${vault.name} restored` : `${vault.name} archived`, '📦')
  }

  return (
    <div className="stack stack--lg" style={{ ['--vault-accent' as string]: accent }}>
      <div className="row row--between">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate({ name: 'vaults' })}>
          <IconBack size={16} /> Vaults
        </button>
        <div className="row row--tight">
          <button className="btn btn--ghost btn--icon" onClick={() => setEditing(true)} aria-label="Edit vault">
            <IconEdit />
          </button>
          <button className="btn btn--ghost btn--icon" onClick={() => setConfirmDelete(true)} aria-label="Delete vault">
            <IconTrash />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ summary */}
      <section className="card card--pad-lg vaulthero">
        <Ring value={pace.fraction} size={116} stroke={10} color={accent}>
          <span className="vaulthero__glyph" aria-hidden>{vault.emoji}</span>
        </Ring>

        <h1 className="vaulthero__name">{vault.name}</h1>
        {vault.note && <p className="small muted center">{vault.note}</p>}

        <p className="vaulthero__figure money">
          {fmt.money(vault.saved)}
          {vault.target != null && <span className="faint"> / {fmt.money(vault.target)}</span>}
        </p>

        <div className="row row--tight">
          <PaceBadge pace={pace} />
          {vault.deadline && (
            <span className="badge">📅 {formatCountdown(vault.deadline)}</span>
          )}
        </div>

        <button className="btn btn--primary btn--block" onClick={() => onSave(vault.id)}>
          <IconPlus size={18} /> Add to {vault.name}
        </button>
      </section>

      {/* --------------------------------------------------------------- pace */}
      {vault.target != null && !vault.isComplete && (
        <section className="card stack stack--md">
          <h2 className="section-title">Will you make it?</h2>

          <div className="pacegrid">
            <div className="pacegrid__cell">
              <span className="tiny faint">Still to save</span>
              <strong className="money">{fmt.money(pace.remaining)}</strong>
            </div>
            {pace.requiredPerWeek != null && (
              <div className="pacegrid__cell">
                <span className="tiny faint">Needed per week</span>
                <strong className="money">{fmt.money(pace.requiredPerWeek)}</strong>
              </div>
            )}
            <div className="pacegrid__cell">
              <span className="tiny faint">Your recent pace</span>
              <strong className="money">
                {pace.velocityPerWeek > 0 ? `${fmt.money(pace.velocityPerWeek)}/wk` : '—'}
              </strong>
            </div>
            <div className="pacegrid__cell">
              <span className="tiny faint">Projected finish</span>
              <strong>{pace.projectedFinish ? formatMedium(pace.projectedFinish) : 'Not yet'}</strong>
            </div>
          </div>

          {pace.status === 'behind' || pace.status === 'atrisk' ? (
            <p className="small">
              At {fmt.money(pace.velocityPerWeek)} a week you'd land{' '}
              <strong>{Math.abs(pace.daysEarly ?? 0)} days late</strong>. Lift it to{' '}
              <strong>{fmt.money(pace.requiredPerWeek ?? 0)} a week</strong> and you're back on time.
            </p>
          ) : pace.status === 'ahead' ? (
            <p className="small">
              You're set to finish <strong>{pace.daysEarly} days early</strong> at this rate. Nice.
            </p>
          ) : pace.status === 'nodata' ? (
            <p className="small muted">
              Log a couple of deposits and the app will start projecting a real finish date.
            </p>
          ) : (
            <p className="small">Right on schedule. Keep it steady.</p>
          )}

          <VaultProjection vault={vault} money={fmt.money} />

          {/* --------------------------------------------------- what-if slider */}
          <div className="whatif">
            <div className="row row--between">
              <span className="field__label">If I save…</span>
              <strong className="money">{fmt.money(perWeek)} / week</strong>
            </div>
            <input
              className="slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={pos}
              aria-label="Weekly contribution to simulate"
              onChange={(e) => setPos(Number(e.target.value))}
            />
            {whatIf && (
              <p className="small">
                {whatIf.finish ? (
                  <>
                    …you finish <strong>{formatMedium(whatIf.finish)}</strong>
                    {whatIf.weeksNeeded != null && <span className="faint"> ({whatIf.weeksNeeded} weeks)</span>}
                    {whatIf.onTime === true && <span className="badge badge--good whatif__verdict">In time 🎉</span>}
                    {whatIf.onTime === false && <span className="badge badge--bad whatif__verdict">Too late</span>}
                  </>
                ) : (
                  <span className="muted">Pick an amount above zero to see a date.</span>
                )}
              </p>
            )}
          </div>
        </section>
      )}

      {vault.isComplete && (
        <section className="card center stack stack--sm">
          <p style={{ fontSize: 34 }} aria-hidden>🏆</p>
          <p className="empty__title">Vault filled</p>
          <p className="small muted">
            {vault.reachedAt ? `Target reached ${formatMedium(vault.reachedAt)}.` : 'Target reached.'}
            {vault.deadline && vault.reachedAt && vault.reachedAt <= vault.deadline && ' Ahead of the deadline, too.'}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------ history */}
      <section>
        <h2 className="section-title">
          History
          <span className="faint">{vault.entryCount} {vault.entryCount === 1 ? 'entry' : 'entries'}</span>
        </h2>
        {vault.entries.length === 0 ? (
          <div className="card empty">
            <span className="empty__icon" aria-hidden>🪙</span>
            <p className="small">Nothing in here yet.</p>
          </div>
        ) : (
          <ul className="card stack stack--sm">
            {[...vault.entries].reverse().slice(0, 30).map((e) => (
              <ActivityRow
                key={e.id}
                entry={e}
                vaultName={vault.name}
                vaultEmoji={vault.emoji}
                money={fmt.money}
                action={
                  <button
                    className="btn btn--bare btn--icon activity__del"
                    aria-label={`Delete entry of ${fmt.money(e.amount)}`}
                    onClick={() => {
                      dispatch({ type: 'entry/delete', id: e.id })
                      toast('Entry removed', '↩️')
                    }}
                  >
                    <IconTrash size={15} />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <div className="row">
        <button className="btn btn--ghost grow" onClick={toggleArchive}>
          {vault.archived ? 'Restore vault' : 'Archive vault'}
        </button>
      </div>

      <VaultEditor open={editing} onClose={() => setEditing(false)} vault={vault} />

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        dialog
        title={`Delete ${vault.name}?`}
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button className="btn btn--danger grow" onClick={remove}>Delete</button>
          </>
        }
      >
        <p className="small muted">
          The vault goes, but the {fmt.money(vault.saved)} inside it does not — those entries move
          to your general hoard, so your totals and your level stay exactly as they are.
        </p>
      </Sheet>
    </div>
  )
}
