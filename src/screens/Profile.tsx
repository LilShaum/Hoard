import { useRef, useState } from 'react'
import { dispatch, flush, useHoard, useRawState } from '@/store/store'
import { useFormat } from '@/app/format'
import { Sheet } from '@/ui/Sheet'
import { THEMES } from '@/app/themes'
import { CURRENCIES } from '@/domain/money'
import type { State } from '@/domain/types'
import { exportState, importState } from '@/store/persist'
import { initialState } from '@/store/defaults'
import { demoState } from '@/store/demo'
import { formatMedium } from '@/domain/dates'
import { IconCheck, IconLock } from '@/ui/Icons'
import { suppressNextCelebration } from '@/app/effects'
import { toast } from '@/ui/toast'
import { haptic, setSoundEnabled, soundDeposit } from '@/ui/feedback'

export function Profile() {
  const d = useHoard()
  const state = useRawState()
  const fmt = useFormat()
  const fileRef = useRef<HTMLInputElement>(null)

  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [backupText, setBackupText] = useState<string | null>(null)
  const [restoreText, setRestoreText] = useState<string | null>(null)
  const { profile } = state

  const set = (patch: Partial<typeof profile>) => dispatch({ type: 'profile/update', patch })

  /**
   * Embedded viewers (and any sandboxed frame) block page-initiated downloads
   * silently — the click appears to work and no file ever arrives. So a
   * download is only offered where it can actually happen; everywhere else the
   * backup is handed over as text to copy, which works in every context.
   */
  const canDownload = (() => {
    try {
      if ('claude' in window) return false // an embedded viewer, not a page
      return window.self === window.top
    } catch {
      return false // cross-origin frame: definitely sandboxed
    }
  })()

  const backup = () => {
    flush()
    const json = exportState(state)
    if (!canDownload) {
      setBackupText(json)
      return
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hoard-backup-${d.today}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2_000)
    dispatch({ type: 'backup/done', at: Date.now() })
    toast('Backup downloaded')
  }

  const copyBackup = async () => {
    const json = backupText ?? exportState(state)
    try {
      await navigator.clipboard.writeText(json)
      dispatch({ type: 'backup/done', at: Date.now() })
      toast('Backup copied to the clipboard')
    } catch {
      toast('Select the text and copy it')
    }
  }

  /**
   * Someone restoring is, at that instant, demonstrably holding a copy of
   * exactly this state — so it counts as backed up. Without this, restoring an
   * old file would fire the backup nudge immediately.
   */
  const markBackedUp = (s: State): State =>
    ({ ...s, progress: { ...s.progress, lastBackupAt: Date.now() } })

  const restoreFromText = (text: string) => {
    const next = importState(text)
    if (!next) {
      toast("That doesn't look like a Hoard backup")
      return
    }
    suppressNextCelebration()
    dispatch({ type: 'state/replace', state: markBackedUp(next) })
    setRestoreText(null)
    toast(`Restored ${next.entries.length} entries`)
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    const next = importState(text)
    if (!next) {
      toast("That file doesn't look like a Hoard backup")
      return
    }
    suppressNextCelebration()
    dispatch({ type: 'state/replace', state: markBackedUp(next) })
    toast(`Restored ${next.entries.length} entries`)
  }

  const themeUnlocked = (level: number) => d.level.level >= level

  return (
    <div className="stack stack--lg">
      <section className="panel panel__body stack stack--md">
        <div className="field">
          <label className="label" htmlFor="profile-name">What should we call you?</label>
          <input
            id="profile-name"
            className="input"
            value={profile.name}
            maxLength={40}
            placeholder="Your name"
            onChange={(e) => set({ name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="profile-currency">Currency</label>
          <select
            id="profile-currency"
            className="select"
            value={profile.currency}
            onChange={(e) => set({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
            ))}
          </select>
          <p className="tiny faint">
            Amounts already logged aren't converted — this only changes how they're shown.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- appearance */}
      <section className="panel">
        <header className="panel__head"><span className="label">Appearance</span></header>
        <div className="panel__body stack stack--sm">
          <div className="seg" role="group" aria-label="Appearance">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                className="seg__opt"
                aria-pressed={profile.appearance === mode}
                onClick={() => set({ appearance: mode })}
              >
                {mode === 'system' ? 'Match device' : mode === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          <p className="tiny faint">
            Match device follows your phone's own light and dark setting, including
            the overnight switch if you have one scheduled.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------- themes */}
      <section className="section">
        <div className="section__head">
          <span className="label">Accent</span>
          <span className="tiny faint num">
            {profile.unlockedThemes.length} / {THEMES.length} unlocked
          </span>
        </div>
        <ul className="themegrid">
          {THEMES.map((t) => {
            const unlocked = themeUnlocked(t.unlockLevel)
            const active = profile.theme === t.key
            return (
              <li key={t.key}>
                <button
                  className={`themeopt ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}`}
                  disabled={!unlocked}
                  aria-pressed={active}
                  onClick={() => { set({ theme: t.key }); haptic(8) }}
                >
                  <span
                    className="themeopt__swatch"
                    style={{ background: t.swatch }}
                    aria-hidden
                  />
                  <span className="themeopt__name">{t.label}</span>
                  {unlocked
                    ? active && <span className="themeopt__tick"><IconCheck size={13} strokeWidth={3} /></span>
                    : <span className="tiny faint"><IconLock size={11} className="inline-icon" /> Lv {t.unlockLevel}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="tiny faint">
          Each rank unlocks the next accent.
          {d.nextRank && ` ${d.nextRank.name} arrives at level ${d.nextRank.minLevel}.`}
        </p>
      </section>

      {/* ------------------------------------------------------------ toggles */}
      <section className="panel panel__body stack stack--sm">
        <Toggle
          label="Sound effects"
          hint="Coin pings and level-up fanfares, synthesised — nothing to download."
          checked={profile.sound}
          onChange={(on) => {
            set({ sound: on })
            setSoundEnabled(on)
            if (on) soundDeposit()
          }}
        />
        <Toggle
          label="Reduce motion"
          hint="Turns off confetti, roll-up counters and transitions."
          checked={profile.reduceMotion}
          onChange={(on) => set({ reduceMotion: on })}
        />
      </section>

      {/* --------------------------------------------------------------- data */}
      <section className="panel panel__body stack stack--md">
        <span className="label">Your data</span>
        <p className="small muted">
          Everything lives in this browser. Nothing is uploaded, there's no account, and
          no one — including us — can see it. That also means clearing your browser data
          clears your hoard, so take a backup now and then.
          {!canDownload && ' Downloads are blocked in this view, so backups are handed over as text you can copy.'}
        </p>

        <div className="row row--tight row--wrap">
          {canDownload && (
            <button className="btn btn--sm" onClick={backup}>Download backup</button>
          )}
          {/* Always offered: if the environment detection above is ever wrong,
              this is the path that still works. */}
          <button className="btn btn--sm" onClick={() => setBackupText(exportState(state))}>
            Copy backup
          </button>
          {canDownload && (
            <button className="btn btn--sm" onClick={() => fileRef.current?.click()}>
              Restore from file
            </button>
          )}
          <button className="btn btn--sm" onClick={() => setRestoreText('')}>
            Paste a backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>

        <div className="row row--tight row--wrap">
          <button className="btn btn--sm" onClick={() => setConfirmDemo(true)}>
            Load demo data
          </button>
          <button className="btn btn--danger btn--sm" onClick={() => setConfirmReset(true)}>
            Erase everything
          </button>
        </div>

        <dl className="datastats tiny faint">
          <div><dt>Entries</dt><dd>{state.entries.length}</dd></div>
          <div><dt>Vaults</dt><dd>{state.vaults.length}</dd></div>
          <div><dt>Saving since</dt><dd>{formatMedium(profile.createdAt)}</dd></div>
          <div><dt>Total XP</dt><dd>{d.xp.total.toLocaleString()}</dd></div>
          <div><dt>In the hoard</dt><dd>{fmt.money(d.totalSaved)}</dd></div>
        </dl>
      </section>

      <p className="tiny faint center about">
        <strong>Hoard</strong> · built for a friend who asked for a money app that felt like a game.
        <br />No accounts, no ads, no bank connection — just you and the pile.
      </p>

      <Sheet
        open={backupText != null}
        onClose={() => setBackupText(null)}
        title="Your backup"
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setBackupText(null)}>Done</button>
            <button className="btn btn--primary grow" onClick={copyBackup}>Copy to clipboard</button>
          </>
        }
      >
        <div className="stack stack--sm">
          <p className="small muted">
            Copy this somewhere safe — a note, an email to yourself — and paste it back
            in to restore. This works everywhere, including views where downloads are
            blocked.
          </p>
          <textarea
            className="textarea backup"
            readOnly
            value={backupText ?? ''}
            aria-label="Backup data"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </Sheet>

      <Sheet
        open={restoreText != null}
        onClose={() => setRestoreText(null)}
        title="Paste a backup"
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setRestoreText(null)}>Cancel</button>
            <button
              className="btn btn--primary grow"
              disabled={!restoreText?.trim()}
              onClick={() => restoreFromText(restoreText ?? '')}
            >
              Restore
            </button>
          </>
        }
      >
        <div className="stack stack--sm">
          <p className="small muted">
            Paste the backup text you saved earlier. This replaces everything currently
            in the app.
          </p>
          <textarea
            className="textarea backup"
            value={restoreText ?? ''}
            placeholder='{"version":1,…}'
            aria-label="Backup data to restore"
            onChange={(e) => setRestoreText(e.target.value)}
          />
        </div>
      </Sheet>

      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        dialog
        title="Erase everything?"
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button
              className="btn btn--danger grow"
              onClick={() => {
                suppressNextCelebration()
                dispatch({ type: 'state/replace', state: initialState() })
                setConfirmReset(false)
                toast('Everything cleared')
              }}
            >
              Erase
            </button>
          </>
        }
      >
        <p className="small muted">
          This deletes every vault, entry, level and badge on this device. If you might
          want it back, download a backup first — this can't be undone.
        </p>
      </Sheet>

      <Sheet
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        dialog
        title="Load demo data?"
        footer={
          <>
            <button className="btn btn--ghost grow" onClick={() => setConfirmDemo(false)}>Cancel</button>
            <button
              className="btn btn--primary grow"
              onClick={() => {
                suppressNextCelebration()
                dispatch({ type: 'state/replace', state: demoState() })
                setConfirmDemo(false)
                toast('Six months of demo saving loaded')
              }}
            >
              Load it
            </button>
          </>
        }
      >
        <p className="small muted">
          Replaces what's here with six months of realistic history — vaults mid-flight,
          a finished one, a streak, a rough patch and a couple of withdrawals. Handy for
          seeing what the app looks like once it's lived in.
        </p>
      </Sheet>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: {
  label: string; hint: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="toggle">
      <span className="grow">
        <span className="toggle__label">{label}</span>
        <span className="tiny faint">{hint}</span>
      </span>
      <input
        type="checkbox"
        className="sr-only toggle__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden><span className="toggle__thumb" /></span>
    </label>
  )
}
