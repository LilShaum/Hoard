import { useState } from 'react'
import { dispatch, dispatchAll } from '@/store/store'
import { useFormat } from '@/app/format'
import { Sheet } from '@/ui/Sheet'
import { Notch } from '@/ui/parts'
import { Creature } from '@/ui/Creature'
import { Glyph } from '@/ui/Glyphs'
import { CURRENCIES, parseAmount } from '@/domain/money'
import { addMonths, todayISO } from '@/domain/dates'
import { VAULT_PRESETS, type VaultDraft } from '@/store/defaults'
import { addVault } from '@/store/reducer'
import { demoState } from '@/store/demo'
import { suppressNextCelebration } from '@/app/effects'
import { toast } from '@/ui/toast'
import { haptic } from '@/ui/feedback'

const STEPS = 5

function nextChristmas(today = todayISO()): string {
  const year = Number(today.slice(0, 4))
  const thisYear = `${year}-12-20`
  return today <= thisYear ? thisYear : `${year + 1}-12-20`
}

/**
 * First run. Five short screens, all skippable — the goal is one vault and two
 * numbers, because an app that opens empty is an app that gets deleted.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const fmt = useFormat()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState(fmt.currency)
  const [preset, setPreset] = useState<number | null>(0)
  const [targetRaw, setTargetRaw] = useState('')
  const [monthlyRaw, setMonthlyRaw] = useState('')
  const [weeklyRaw, setWeeklyRaw] = useState('')

  const chosen = preset != null ? VAULT_PRESETS[preset] : null
  const target = parseAmount(targetRaw) ?? chosen?.target ?? null
  const monthly = parseAmount(monthlyRaw)
  const weekly = parseAmount(weeklyRaw)

  const finish = () => {
    const actions = [{
      type: 'profile/update' as const,
      patch: {
        name: name.trim(),
        currency,
        monthlyTarget: monthly && monthly > 0 ? monthly : 0,
        weeklyLimit: weekly && weekly > 0 ? weekly : 0,
        onboarded: true,
      },
    }]

    if (chosen) {
      const draft: VaultDraft = {
        name: chosen.name,
        glyph: chosen.glyph,
        type: chosen.type,
        target: target && target > 0 ? target : null,
        deadline: chosen.fixedDeadline
          ? nextChristmas()
          : chosen.monthsOut ? addMonths(todayISO(), chosen.monthsOut) : null,
      }
      actions.push(addVault(draft) as never)
    }

    dispatchAll(actions)
    haptic([10, 30, 10])
    toast('Your hoard begins')
    onDone()
  }

  const skipToDemo = () => {
    suppressNextCelebration()
    dispatch({ type: 'state/replace', state: demoState() })
    toast('Loaded a demo hoard — have a poke around')
    onDone()
  }

  const next = () => (step === STEPS - 1 ? finish() : setStep((s) => s + 1))

  return (
    <Sheet open onClose={onDone} required title={`Step ${step + 1} of ${STEPS}`}
           labelledBy="onboarding-title">
      <div className="onboard">
        <Notch value={(step + 1) / STEPS} cells={STEPS} thin label="Setup progress" />

        {step === 0 && (
          <div className="onboard__step">
            <span className="onboard__art" style={{ color: 'var(--accent)' }}>
              <Creature stage={0} size={82} />
            </span>
            <h1 id="onboarding-title" className="onboard__title">Welcome to Hoard</h1>
            <p className="muted">
              You save money the normal way — in your own account. Hoard is the part
              that makes it a game: vaults to fill, a weekly limit to hold, a companion
              that grows as you go.
            </p>
            <div className="field">
              <label className="label" htmlFor="ob-name">What should we call you?</label>
              <input id="ob-name" className="input" value={name} maxLength={40}
                     placeholder="Optional" autoComplete="given-name"
                     onChange={(e) => setName(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') next() }} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onboard__step">
            <h1 id="onboarding-title" className="onboard__title">Your currency</h1>
            <p className="muted">Pick the currency you actually save in.</p>
            <div className="field">
              <label className="label" htmlFor="ob-currency">Currency</label>
              <select id="ob-currency" className="select" value={currency}
                      onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboard__step">
            <h1 id="onboarding-title" className="onboard__title">What are you saving for?</h1>
            <p className="muted">
              This becomes your first vault. Give it a date and Hoard works out what you
              need per week — and tells you honestly whether you are on track.
            </p>

            <div className="row row--tight row--wrap">
              {VAULT_PRESETS.map((p, i) => (
                <button key={p.name} className="chip" aria-pressed={preset === i}
                        onClick={() => { setPreset(i); setTargetRaw('') }}>
                  <span style={{ color: `var(--t-${p.type})`, display: 'contents' }}>
                    <Glyph name={p.glyph} size={15} />
                  </span>
                  {p.name}
                </button>
              ))}
              <button className="chip" aria-pressed={preset === null} onClick={() => setPreset(null)}>
                Skip for now
              </button>
            </div>

            {chosen && (
              <>
                <p className="tiny faint">{chosen.blurb}</p>
                <div className="field">
                  <label className="label" htmlFor="ob-target">How much?</label>
                  <div className="row row--tight">
                    <span className="faint num">{fmt.symbol}</span>
                    <input id="ob-target" className="input num" type="text" inputMode="decimal"
                           value={targetRaw} placeholder={String((chosen.target ?? 0) / 100)}
                           onChange={(e) => setTargetRaw(e.target.value)} />
                  </div>
                </div>
                {chosen.fixedDeadline && (
                  <p className="tiny faint">Due 20 December — plenty of time if you start now.</p>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="onboard__step">
            <h1 id="onboarding-title" className="onboard__title">A monthly deposit goal</h1>
            <p className="muted">
              One figure to aim at each month. Pick something you would hit most months,
              not your best month — you can change it any time.
            </p>
            <div className="amount">
              <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
              <input className="amount__input num" type="text" inputMode="decimal" placeholder="0"
                     aria-label="Monthly deposit goal" value={monthlyRaw}
                     onChange={(e) => setMonthlyRaw(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') next() }} />
            </div>
            <div className="row row--tight row--wrap">
              {[5_000, 10_000, 20_000, 40_000].map((v) => (
                <button key={v} className="chip" onClick={() => setMonthlyRaw(String(v / 100))}>
                  {fmt.money(v)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onboard__step">
            <h1 id="onboarding-title" className="onboard__title">A weekly spending limit</h1>
            <p className="muted">
              The other half of saving. Set it and Hoard tells you what is safe to spend
              today, rather than only what you have already spent.
            </p>
            <div className="amount">
              <span className="amount__symbol" aria-hidden>{fmt.symbol}</span>
              <input className="amount__input num" type="text" inputMode="decimal" placeholder="0"
                     aria-label="Weekly spending limit" value={weeklyRaw}
                     onChange={(e) => setWeeklyRaw(e.target.value)}
                     onKeyDown={(e) => { if (e.key === 'Enter') finish() }} />
            </div>
            <div className="row row--tight row--wrap">
              {[7_500, 10_000, 15_000, 25_000].map((v) => (
                <button key={v} className="chip" onClick={() => setWeeklyRaw(String(v / 100))}>
                  {fmt.money(v)}
                </button>
              ))}
            </div>
            <p className="tiny faint">Optional — you can set one later from Goals.</p>
          </div>
        )}

        <div className="onboard__nav">
          {step > 0 ? (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>Back</button>
          ) : (
            <button className="btn btn--link" onClick={skipToDemo}>See a demo instead</button>
          )}
          <button className="btn btn--primary grow" onClick={next}>
            {step === STEPS - 1 ? 'Start my hoard' : 'Next'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
