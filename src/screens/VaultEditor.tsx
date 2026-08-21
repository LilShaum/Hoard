import { useEffect, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { useFormat } from '@/app/format'
import { parseAmount } from '@/domain/money'
import { addMonths, todayISO } from '@/domain/dates'
import type { AccentKey, Vault } from '@/domain/types'
import { ACCENTS, EMOJI_CHOICES, VAULT_PRESETS, type VaultDraft } from '@/store/defaults'
import { addVault } from '@/store/reducer'
import { dispatch } from '@/store/store'
import { toast } from '@/ui/toast'
import { haptic } from '@/ui/feedback'

type Props = {
  open: boolean
  onClose: () => void
  /** Editing an existing vault, or null to create a new one. */
  vault?: Vault | null
  onCreated?: (name: string) => void
}

/** Christmas of the year you'd actually still be saving for. */
function nextChristmas(today = todayISO()): string {
  const year = Number(today.slice(0, 4))
  const thisYear = `${year}-12-20`
  return today <= thisYear ? thisYear : `${year + 1}-12-20`
}

const blank = (): VaultDraft & { note: string } => ({
  name: '', emoji: '🎯', target: null, deadline: null, color: 'gold', note: '',
})

export function VaultEditor({ open, onClose, vault = null, onCreated }: Props) {
  const fmt = useFormat()
  const editing = vault != null

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [targetRaw, setTargetRaw] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState<AccentKey>('gold')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    const src = vault ?? blank()
    setName(src.name)
    setEmoji(src.emoji)
    setTargetRaw(src.target ? String(src.target / 100) : '')
    setDeadline(src.deadline ?? '')
    setColor(src.color)
    setNote(src.note ?? '')
  }, [open, vault])

  const applyPreset = (preset: (typeof VAULT_PRESETS)[number]) => {
    haptic(8)
    setName(preset.name)
    setEmoji(preset.emoji)
    setTargetRaw(preset.target ? String(preset.target / 100) : '')
    setColor(preset.color)
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
      emoji,
      target: target && target > 0 ? target : null,
      deadline: deadline || null,
      color,
      note: note.trim(),
    }
    if (editing && vault) {
      dispatch({ type: 'vault/update', id: vault.id, patch: draft })
      toast(`${draft.name} updated`, draft.emoji)
    } else {
      dispatch(addVault(draft))
      toast(`${draft.name} vault opened`, draft.emoji)
      onCreated?.(draft.name)
    }
    haptic(12)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Edit vault' : 'New vault'}
      footer={
        <>
          <button className="btn btn--ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary grow" disabled={!valid} onClick={submit}>
            {editing ? 'Save changes' : 'Open vault'}
          </button>
        </>
      }
    >
      <div className="stack">
        {!editing && (
          <div className="field">
            <span className="field__label">Start from</span>
            <div className="row row--tight row--wrap">
              {VAULT_PRESETS.map((p) => (
                <button key={p.name} className="chip" onClick={() => applyPreset(p)}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="vault-name">Name</label>
          <div className="row row--tight">
            <span className="emoji-btn" aria-hidden>{emoji}</span>
            <input
              id="vault-name"
              className="input grow"
              value={name}
              maxLength={40}
              placeholder="Christmas"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <span className="field__label">Icon</span>
          <div className="emoji-grid" role="radiogroup" aria-label="Vault icon">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                className="emoji-opt"
                role="radio"
                aria-checked={emoji === e}
                aria-label={`Icon ${e}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="vault-target">
            Target <span className="faint">(optional)</span>
          </label>
          <div className="row row--tight">
            <span className="faint">{fmt.symbol}</span>
            <input
              id="vault-target"
              className="input grow"
              type="text"
              inputMode="decimal"
              value={targetRaw}
              placeholder="500"
              onChange={(e) => setTargetRaw(e.target.value)}
            />
          </div>
          <p className="tiny faint">Leave it blank for an open vault that just accumulates.</p>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="vault-deadline">
            Due date <span className="faint">(optional)</span>
          </label>
          <input
            id="vault-deadline"
            className="input"
            type="date"
            value={deadline}
            min={todayISO()}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <p className="tiny faint">
            A date turns on pace tracking — how much a week, and whether you'll make it.
          </p>
          {deadline && (
            <button className="btn btn--bare tiny faint" onClick={() => setDeadline('')}>
              Clear the date
            </button>
          )}
        </div>

        <div className="field">
          <span className="field__label">Colour</span>
          <div className="row row--tight row--wrap" role="radiogroup" aria-label="Vault colour">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className="swatch"
                role="radio"
                aria-checked={color === c}
                aria-label={c}
                style={{ ['--vault-accent' as string]: `var(--a-${c})` }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="vault-note">Note</label>
          <input
            id="vault-note"
            className="input"
            value={note}
            maxLength={200}
            placeholder="What is this for?"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  )
}
