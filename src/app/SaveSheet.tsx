import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { IconCalendar, IconCheck } from '@/ui/Icons'
import { Glyph } from '@/ui/Glyphs'
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
  vaultId?: string | null
  /** Opens straight onto the spending tab — used by the week panel. */
  initialKind?: EntryKind
}

const KINDS: Array<{ key: EntryKind; label: string; verb: string }> = [
  { key: 'deposit', label: 'Saved', verb: 'Save it' },
  { key: 'spend', label: 'Spent', verb: 'Log it' },
  { key: 'withdrawal', label: 'Took out', verb: 'Withdraw' },
]

/** Quick-add amounts scaled to what this person actually logs. */
function quickAmounts(average: number, fallback: number[]): number[] {
  if (average <= 0) return fallback
  const base = niceMoney(average)
  const set = new Set([
    niceMoney(Math.round(base / 2)), base, niceMoney(base * 2), niceMoney(base * 4),
  ])
  return [...set].sort((a, b) => a - b).slice(0, 4)
}

export function SaveSheet({ open, onClose, vaultId = null, initialKind = 'deposit' }: Props) {
  const d = useHoard()
  const fmt = useFormat()

  const [raw, setRaw] = useState('')
  const [kind, setKind] = useState<EntryKind>(initialKind)
  const [target, setTarget] = useState<string | null>(vaultId)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setRaw('')
    setKind(initialKind)
    setTarget(vaultId)
    setDate(todayISO())
    setNote('')
    const id = setTimeout(() => inputRef.current?.focus(), 110)
    return () => clearTimeout(id)
  }, [open, vaultId, initialKind])

  const cents = parseAmount(raw)
  const valid = cents != null && cents > 0
  const isSpend = kind === 'spend'

  const quick = useMemo(
    () => isSpend
      ? quickAmounts(Math.round(d.budget.limit / 12), [500, 1000, 2000, 4000])
      : quickAmounts(d.records.averageDeposit, [500, 1000, 2000, 5000]),
    [isSpend, d.budget.limit, d.records.averageDeposit],
  )

  const openVaults = d.vaults.filter((v) => !v.archived)
  const verb = KINDS.find((k) => k.key === kind)?.verb ?? 'Save it'

  const submit = () => {
    if (!valid) return
    const before = derive(getState()).xp.total
    dispatch(addEntry({ amount: cents, vaultId: isSpend ? null : target, kind, date, note }))
    const gained = derive(getState()).xp.total - before

    if (kind === 'deposit') {
      soundDeposit()
      haptic([10, 30, 14])
      const where = target ? d.vaultById.get(target)?.name ?? 'your hoard' : 'the hoard'
      toast(`${fmt.money(cents)} into ${where}`, gained > 0 ? gained : undefined)
    } else if (isSpend) {
      haptic(10)
      const left = Math.max(0, d.budget.remaining - cents)
      toast(d.budget.limit > 0
        ? `${fmt.money(cents)} spent · ${fmt.money(left)} left this week`
        : `${fmt.money(cents)} spent`)
    } else {
      haptic(16)
      toast(`${fmt.money(cents)} taken back out`)
    }
    onClose()
  }

  const dateChips = [
    { label: 'Today', value: todayISO() },
    { label: 'Yesterday', value: addDays(todayISO(), -1) },
  ]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Log an amount"
      footer={
        <button className="btn btn--primary" disabled={!valid} onClick={submit}>
          <IconCheck size={16} /> {verb}
        </button>
      }
    >
      <div className="stack">
        <div className="seg" role="group" aria-label="What kind of movement">
          {KINDS.map((k) => (
            <button
              key={k.key}
              className="seg__opt"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="amount">
          <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
          <input
            ref={inputRef}
            className="amount__input num"
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
            <button key={q} className="chip" onClick={() => { haptic(6); setRaw(((cents ?? 0) + q) / 100 + '') }}>
              + {fmt.money(q)}
            </button>
          ))}
          {raw !== '' && <button className="chip" onClick={() => setRaw('')}>Clear</button>}
        </div>

        {isSpend ? (
          <p className="tiny faint">
            Spending is measured against your weekly limit. It never touches the hoard
            balance — that stays whatever you have actually put away.
            {d.budget.limit > 0 && (
              <> Right now {fmt.money(d.budget.remaining)} of this week's {fmt.money(d.budget.limit)} is left.</>
            )}
          </p>
        ) : (
          <div className="field">
            <span className="label">Which vault</span>
            <div className="row row--tight row--wrap">
              <button className="chip" aria-pressed={target === null} onClick={() => setTarget(null)}>
                <Glyph name="coin" size={15} /> Bank
              </button>
              {openVaults.map((v) => (
                <button key={v.id} className="chip" aria-pressed={target === v.id}
                        onClick={() => setTarget(v.id)}>
                  <span style={{ color: `var(--t-${v.type})`, display: 'contents' }}>
                    <Glyph name={v.glyph} size={15} />
                  </span>
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <span className="label">When</span>
          <div className="row row--tight row--wrap">
            {dateChips.map((c) => (
              <button key={c.value} className="chip" aria-pressed={date === c.value}
                      onClick={() => setDate(c.value)}>
                {c.label}
              </button>
            ))}
            <label className="chip">
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

        <div className="field">
          <label className="label" htmlFor="entry-note">Note</label>
          <input
            id="entry-note"
            className="input"
            value={note}
            maxLength={200}
            placeholder={isSpend ? 'Groceries' : 'Skipped a takeaway'}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Sheet>
  )
}
