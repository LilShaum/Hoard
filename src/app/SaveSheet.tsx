import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { IconCalendar, IconCheck } from '@/ui/Icons'
import { useFormat } from './format'
import { derive } from '@/domain/selectors'
import { parseAmount } from '@/domain/money'
import { niceMoney } from '@/domain/quests'
import { addDays, formatShort, todayISO } from '@/domain/dates'
import type { EntryKind } from '@/domain/types'
import { addEntry } from '@/store/reducer'
import { dispatch, getState, useHoard } from '@/store/store'
import { toast } from '@/ui/toast'
import { haptic, soundDeposit } from '@/ui/feedback'

type Props = {
  open: boolean
  onClose: () => void
  /** Pre-selects a vault when opened from a vault screen. */
  vaultId?: string | null
}

/** Quick-add chips, scaled to what this user actually saves. */
function quickAmounts(average: number): number[] {
  if (average <= 0) return [500, 1000, 2000, 5000]
  const base = niceMoney(average)
  const set = new Set([
    niceMoney(Math.round(base / 2)),
    base,
    niceMoney(base * 2),
    niceMoney(base * 4),
  ])
  return [...set].sort((a, b) => a - b).slice(0, 4)
}

export function SaveSheet({ open, onClose, vaultId = null }: Props) {
  const d = useHoard()
  const fmt = useFormat()

  const [raw, setRaw] = useState('')
  const [kind, setKind] = useState<EntryKind>('deposit')
  const [target, setTarget] = useState<string | null>(vaultId)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset to a clean slate each time it opens, honouring the vault it opened from.
  useEffect(() => {
    if (!open) return
    setRaw('')
    setKind('deposit')
    setTarget(vaultId)
    setDate(todayISO())
    setNote('')
    setShowNote(false)
    const id = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(id)
  }, [open, vaultId])

  const cents = parseAmount(raw)
  const valid = cents != null && cents > 0
  const quick = useMemo(() => quickAmounts(d.records.averageDeposit), [d.records.averageDeposit])
  const openVaults = d.vaults.filter((v) => !v.archived)

  const bump = (amount: number) => {
    haptic(8)
    setRaw(((cents ?? 0) + amount) / 100 + '')
  }

  const submit = () => {
    if (!valid) return

    const before = derive(getState()).xp.total
    dispatch(addEntry({ amount: cents, vaultId: target, kind, date, note }))
    const after = derive(getState()).xp.total
    const gained = after - before

    if (kind === 'deposit') {
      soundDeposit()
      haptic([10, 30, 14])
      const where = target ? d.vaultById.get(target)?.name ?? 'your hoard' : 'the hoard'
      toast(`${fmt.money(cents)} into ${where}`, '🪙', gained > 0 ? gained : undefined)
    } else {
      haptic(16)
      toast(`${fmt.money(cents)} taken back out`, '↩️')
    }
    onClose()
  }

  const dateChips: Array<{ label: string; value: string }> = [
    { label: 'Today', value: todayISO() },
    { label: 'Yesterday', value: addDays(todayISO(), -1) },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === 'deposit' ? 'Add to the hoard' : 'Take some back'}
      footer={
        <button className="btn btn--primary btn--block" disabled={!valid} onClick={submit}>
          <IconCheck size={18} />
          {kind === 'deposit' ? 'Save it' : 'Withdraw'}
        </button>
      }
    >
      <div className="stack">
        <div className="amount">
          <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
          <input
            ref={inputRef}
            className="amount__input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            aria-label="Amount"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          />
        </div>

        <div className="row row--tight row--wrap">
          {quick.map((q) => (
            <button key={q} className="chip" onClick={() => bump(q)}>
              + {fmt.money(q)}
            </button>
          ))}
          {raw !== '' && (
            <button className="chip" onClick={() => setRaw('')}>Clear</button>
          )}
        </div>

        <div className="field">
          <span className="field__label">Where does it go?</span>
          <div className="row row--tight row--wrap">
            <button
              className="chip"
              aria-pressed={target === null}
              onClick={() => setTarget(null)}
            >
              🪙 General hoard
            </button>
            {openVaults.map((v) => (
              <button
                key={v.id}
                className="chip"
                aria-pressed={target === v.id}
                onClick={() => setTarget(v.id)}
              >
                {v.emoji} {v.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">When</span>
          <div className="row row--tight row--wrap">
            {dateChips.map((c) => (
              <button
                key={c.value}
                className="chip"
                aria-pressed={date === c.value}
                onClick={() => setDate(c.value)}
              >
                {c.label}
              </button>
            ))}
            <label className="chip" style={{ position: 'relative', gap: 6 }}>
              <IconCalendar size={14} />
              {dateChips.some((c) => c.value === date) ? 'Other' : formatShort(date)}
              <input
                type="date"
                className="sr-only"
                value={date}
                max={todayISO()}
                aria-label="Pick a date"
                onChange={(e) => { if (e.target.value) setDate(e.target.value) }}
              />
            </label>
          </div>
        </div>

        {showNote ? (
          <div className="field">
            <label className="field__label" htmlFor="entry-note">Note</label>
            <input
              id="entry-note"
              className="input"
              value={note}
              maxLength={200}
              placeholder="Skipped a takeaway"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        ) : (
          <button className="btn btn--bare small faint" onClick={() => setShowNote(true)}>
            + Add a note
          </button>
        )}

        <div className="row row--tight">
          <button
            className="chip"
            aria-pressed={kind === 'deposit'}
            onClick={() => setKind('deposit')}
          >
            Saving
          </button>
          <button
            className="chip"
            aria-pressed={kind === 'withdrawal'}
            onClick={() => setKind('withdrawal')}
          >
            Taking out
          </button>
        </div>
      </div>
    </Sheet>
  )
}
