import { useMemo, useState } from 'react'
import { dispatch, useHoard } from '@/store/store'
import { useFormat } from '@/app/format'
import { Sheet } from '@/ui/Sheet'
import { Glyph } from '@/ui/Glyphs'
import { ActivityRow, Notch, PaceStatus, TypeChip } from '@/ui/parts'
import { IconBack, IconEdit, IconPlus, IconTrash } from '@/ui/Icons'
import { VaultEditor } from './VaultEditor'
import { VaultProjection } from '@/charts/VaultProjection'
import { simulate, suggestedPerWeek } from '@/domain/pace'
import { formatCountdown, formatMedium, plural, todayISO } from '@/domain/dates'
import { toast } from '@/ui/toast'
import { haptic } from '@/ui/feedback'
import type { Route } from '@/app/router'

type Props = {
  vaultId: string
  navigate: (r: Route) => void
  onLog: (vaultId?: string | null) => void
}

/** Geometric, so one drag spans a very small weekly amount to a very large one. */
function sliderToCents(pos: number, anchor: number): number {
  const min = Math.max(100, anchor / 8)
  const max = Math.max(min * 2, anchor * 6)
  return Math.max(100, Math.round((min * Math.pow(max / min, pos)) / 100) * 100)
}

export function VaultDetail({ vaultId, navigate, onLog }: Props) {
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
      <div className="panel empty">
        <p className="empty__title">That vault is gone</p>
        <button className="btn btn--sm" onClick={() => navigate({ name: 'vaults' })}>
          Back to vaults
        </button>
      </div>
    )
  }

  const { pace } = vault
  const tint = `var(--t-${vault.type})`

  const remove = () => {
    dispatch({ type: 'vault/delete', id: vault.id })
    toast(`${vault.name} deleted — its money moved to the general hoard`)
    haptic(18)
    navigate({ name: 'vaults' })
  }

  return (
    <div className="stack stack--lg" style={{ ['--vault-accent' as string]: tint }}>
      <div className="row row--between">
        <button className="btn btn--sm" onClick={() => navigate({ name: 'vaults' })}>
          <IconBack size={15} /> Vaults
        </button>
        <div className="row row--tight">
          <button className="btn btn--icon" onClick={() => setEditing(true)} aria-label="Edit vault">
            <IconEdit />
          </button>
          <button className="btn btn--icon" onClick={() => setConfirmDelete(true)} aria-label="Delete vault">
            <IconTrash />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- header */}
      <section className="panel">
        <header className="panel__head">
          <span className="row row--tight">
            <span style={{ color: tint }}><Glyph name={vault.glyph} size={18} /></span>
            <span className="vaulthero__name">{vault.name}</span>
          </span>
          <TypeChip type={vault.type} />
        </header>

        <div className="panel__body stack stack--md">
          {vault.note && <p className="small muted">{vault.note}</p>}

          <p className="num--hero hoard__total">
            {fmt.money(vault.saved)}
            {vault.target != null && <span className="faint hoard__of"> / {fmt.money(vault.target)}</span>}
          </p>

          {vault.target != null && (
            <Notch value={pace.fraction} color={tint} tall cells={20}
                   label={`${Math.round(pace.fraction * 100)}% of ${vault.name}`} />
          )}

          <div className="row row--tight row--wrap">
            {vault.isComplete ? <PaceStatus pace={pace} /> : <PaceStatus pace={pace} />}
            {vault.deadline && (
              <span className="tiny faint num">{formatCountdown(vault.deadline)}</span>
            )}
          </div>

          <button className="btn btn--primary btn--block" onClick={() => onLog(vault.id)}>
            <IconPlus size={16} /> Add to {vault.name}
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------------- pace */}
      {vault.target != null && !vault.isComplete && (
        <section className="panel">
          <header className="panel__head">
            <span className="label">Will you make it?</span>
          </header>

          <div className="grid grid--2">
            <div>
              <span className="label">Still to save</span>
              <span className="grid__value num">{fmt.money(pace.remaining)}</span>
            </div>
            <div>
              <span className="label">Needed per week</span>
              <span className="grid__value num">
                {pace.requiredPerWeek != null ? fmt.money(pace.requiredPerWeek) : '—'}
              </span>
            </div>
            <div>
              <span className="label">Your recent pace</span>
              <span className="grid__value num">
                {pace.velocityPerWeek > 0 ? `${fmt.money(pace.velocityPerWeek)}/wk` : '—'}
              </span>
            </div>
            <div>
              <span className="label">Projected finish</span>
              <span className="grid__value">
                {pace.projectedFinish ? formatMedium(pace.projectedFinish) : 'Not yet'}
              </span>
            </div>
          </div>

          <div className="panel__body stack stack--md">
            <p className="small">
              {pace.status === 'behind' || pace.status === 'atrisk' ? (
                <>At {fmt.money(pace.velocityPerWeek)} a week you would land{' '}
                  <strong>{plural(Math.abs(pace.daysEarly ?? 0), 'day')} late</strong>. Lift it to{' '}
                  <strong>{fmt.money(pace.requiredPerWeek ?? 0)} a week</strong> and you are back on time.</>
              ) : pace.status === 'ahead' ? (
                <>You are set to finish <strong>{plural(pace.daysEarly ?? 0, 'day')} early</strong> at this rate.</>
              ) : pace.status === 'nodata' ? (
                <span className="muted">Log a couple of deposits and a real finish date appears here.</span>
              ) : (
                <>Right on schedule. Keep it steady.</>
              )}
            </p>

            <VaultProjection vault={vault} money={fmt.money} />

            <div className="whatif">
              <div className="row row--between">
                <span className="label">If I save</span>
                <strong className="num">{fmt.money(perWeek)} / week</strong>
              </div>
              <input
                className="slider"
                type="range" min={0} max={1} step={0.01} value={pos}
                aria-label="Weekly contribution to simulate"
                onChange={(e) => setPos(Number(e.target.value))}
              />
              {whatIf && (
                <p className="small">
                  {whatIf.finish ? (
                    <>
                      you finish <strong>{formatMedium(whatIf.finish)}</strong>
                      {whatIf.weeksNeeded != null && (
                        <span className="faint num"> ({whatIf.weeksNeeded} weeks)</span>
                      )}
                      {whatIf.onTime === true && <span className="whatif__verdict is-good">In time</span>}
                      {whatIf.onTime === false && <span className="whatif__verdict is-bad">Too late</span>}
                    </>
                  ) : (
                    <span className="muted">Pick an amount above zero to see a date.</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {vault.isComplete && (
        <section className="panel empty">
          <p className="empty__title">Vault filled</p>
          <p className="small muted">
            {vault.reachedAt ? `Target reached ${formatMedium(vault.reachedAt)}.` : 'Target reached.'}
            {vault.deadline && vault.reachedAt && vault.reachedAt <= vault.deadline
              && ' Ahead of the deadline, too.'}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------------ history */}
      <section className="section">
        <div className="section__head">
          <span className="label">History</span>
          <span className="tiny faint num">
            {vault.entryCount} {vault.entryCount === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {vault.entries.length === 0 ? (
          <div className="panel empty"><p className="small">Nothing in here yet.</p></div>
        ) : (
          <ul className="panel activity-list">
            {[...vault.entries].reverse().slice(0, 30).map((e) => (
              <ActivityRow
                key={e.id}
                entry={e}
                vaultName={vault.name}
                glyph={vault.glyph}
                type={vault.type}
                money={fmt.money}
                action={
                  <button
                    className="btn btn--icon activity__del"
                    aria-label={`Delete entry of ${fmt.money(e.amount)}`}
                    onClick={() => { dispatch({ type: 'entry/delete', id: e.id }); toast('Entry removed') }}
                  >
                    <IconTrash size={14} />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <button
        className="btn btn--block"
        onClick={() => {
          dispatch({ type: 'vault/update', id: vault.id, patch: { archived: !vault.archived } })
          toast(vault.archived ? `${vault.name} restored` : `${vault.name} archived`)
        }}
      >
        {vault.archived ? 'Restore vault' : 'Archive vault'}
      </button>

      <VaultEditor open={editing} onClose={() => setEditing(false)} vault={vault} />

      <Sheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        dialog
        title={`Delete ${vault.name}?`}
        footer={
          <>
            <button className="btn" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button className="btn btn--danger" onClick={remove}>Delete</button>
          </>
        }
      >
        <p className="small muted">
          The vault goes, but the {fmt.money(vault.saved)} inside it does not — those
          entries move to your general hoard, so your totals and your level stay exactly
          as they are.
        </p>
      </Sheet>
    </div>
  )
}
