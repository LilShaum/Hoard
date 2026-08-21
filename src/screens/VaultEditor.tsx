import { useEffect, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { useFormat } from '@/app/format'
import { Glyph, GLYPH_KEYS, GLYPH_LABEL } from '@/ui/Glyphs'
import { parseAmount } from '@/domain/money'
import { addMonths, todayISO } from '@/domain/dates'
import type { GlyphName, TypeKey, Vault } from '@/domain/types'
import { TYPE_KEYS, TYPE_LABEL, VAULT_PRESETS, type VaultDraft } from '@/store/defaults'
import { addVault } from '@/store/reducer'
import { dispatch } from '@/store/store'
import { toast } from '@/ui/toast'
import { haptic } from '@/ui/feedback'

type Props = {
  open: boolean
  onClose: () => void
  vault?: Vault | null
  onCreated?: (name: string) => void
}

/** The Christmas you'd realistically still be saving for. */
function nextChristmas(today = todayISO()): string {
  const year = Number(today.slice(0, 4))
  const thisYear = `${year}-12-20`
  return today <= thisYear ? thisYear : `${year + 1}-12-20`
}

export function VaultEditor({ open, onClose, vault = null, onCreated }: Props) {
  const fmt = useFormat()
  const editing = vault != null

  const [name, setName] = useState('')
  const [glyph, setGlyph] = useState<GlyphName>('coin')
  const [type, setType] = useState<TypeKey>('wave')
  const [targetRaw, setTargetRaw] = useState('')
  const [deadline, setDeadline] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setName(vault?.name ?? '')
    setGlyph(vault?.glyph ?? 'coin')
    setType(vault?.type ?? 'wave')
    setTargetRaw(vault?.target ? String(vault.target / 100) : '')
    setDeadline(vault?.deadline ?? '')
    setNote(vault?.note ?? '')
  }, [open, vault])

  const applyPreset = (preset: (typeof VAULT_PRESETS)[number]) => {
    haptic(6)
    setName(preset.name)
    setGlyph(preset.glyph)
    setType(preset.type)
    setTargetRaw(preset.target ? String(preset.target / 100) : '')
    setDeadline(
      preset.fixedDeadline ? nextChristmas()
      : preset.monthsOut ? addMonths(todayISO(), preset.monthsOut)
      : '')
  }

  const target = parseAmount(targetRaw)
  const valid = name.trim().length > 0

  const submit = () => {
    if (!valid) return
    const draft: VaultDraft = {
      name: name.trim(),
      glyph,
      type,
      target: target && target > 0 ? target : null,
      deadline: deadline || null,
      note: note.trim(),
    }
    if (editing && vault) {
      dispatch({ type: 'vault/update', id: vault.id, patch: draft })
      toast(`${draft.name} updated`)
    } else {
      dispatch(addVault(draft))
      toast(`${draft.name} vault opened`)
      onCreated?.(draft.name)
    }
    haptic(10)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit vault' : 'New vault'}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" disabled={!valid} onClick={submit}>
            {editing ? 'Save changes' : 'Open vault'}
          </button>
        </>
      }
    >
      <div className="stack">
        {!editing && (
          <div className="field">
            <span className="label">Start from</span>
            <div className="row row--tight row--wrap">
              {VAULT_PRESETS.map((p) => (
                <button key={p.name} className="chip" onClick={() => applyPreset(p)}>
                  <span style={{ color: `var(--t-${p.type})`, display: 'contents' }}>
                    <Glyph name={p.glyph} size={15} />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="vault-name">Name</label>
          <input id="vault-name" className="input" value={name} maxLength={40}
                 placeholder="Christmas" onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field">
          <span className="label">Type</span>
          <div className="typegrid" role="radiogroup" aria-label="Vault type">
            {TYPE_KEYS.map((t) => (
              <button
                key={t}
                className="typeopt"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                style={{ ['--tc' as string]: `var(--t-${t})`, ['--tc-ink' as string]: `var(--on-${t})` }}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Icon</span>
          <div className="glyphgrid" role="radiogroup" aria-label="Vault icon">
            {GLYPH_KEYS.map((g) => (
              <button
                key={g}
                className="glyphopt"
                role="radio"
                aria-checked={glyph === g}
                aria-label={GLYPH_LABEL[g]}
                title={GLYPH_LABEL[g]}
                onClick={() => setGlyph(g)}
                style={{ color: glyph === g ? `var(--t-${type})` : undefined }}
              >
                <Glyph name={g} size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="vault-target">Target — optional</label>
          <div className="row row--tight">
            <span className="faint num">{fmt.symbol}</span>
            <input id="vault-target" className="input num" type="text" inputMode="decimal"
                   value={targetRaw} placeholder="500" onChange={(e) => setTargetRaw(e.target.value)} />
          </div>
          <p className="tiny faint">Leave blank for an open vault that just accumulates.</p>
        </div>

        <div className="field">
          <label className="label" htmlFor="vault-deadline">Due date — optional</label>
          <input id="vault-deadline" className="input" type="date" value={deadline}
                 min={todayISO()} onChange={(e) => setDeadline(e.target.value)} />
          <p className="tiny faint">
            A date turns on pace tracking — how much a week, and whether you will make it.
          </p>
          {deadline && (
            <button className="btn btn--link" onClick={() => setDeadline('')}>Clear the date</button>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="vault-note">Note</label>
          <input id="vault-note" className="input" value={note} maxLength={200}
                 placeholder="What is this for?" onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Sheet>
  )
}
