/**
 * Sound and haptics, both synthesised at runtime — no audio assets, nothing to
 * download, nothing to inline into the bundle.
 */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) { enabled = on }

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    // Browsers suspend the context until a gesture; every call site is a tap.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

type Blip = { freq: number; at: number; dur?: number; gain?: number; type?: OscillatorType }

function play(blips: Blip[]) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const b of blips) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const dur = b.dur ?? 0.12
    const peak = b.gain ?? 0.07
    osc.type = b.type ?? 'sine'
    osc.frequency.setValueAtTime(b.freq, now + b.at)
    gain.gain.setValueAtTime(0.0001, now + b.at)
    gain.gain.exponentialRampToValueAtTime(peak, now + b.at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + b.at + dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(now + b.at)
    osc.stop(now + b.at + dur + 0.02)
  }
}

/** A bright two-note ping — a coin landing on a pile. */
export const soundDeposit = () => play([
  { freq: 880, at: 0, dur: 0.09, type: 'triangle' },
  { freq: 1318.5, at: 0.055, dur: 0.14, type: 'triangle', gain: 0.055 },
])

/** Rising arpeggio for a level-up. */
export const soundLevelUp = () => play([
  { freq: 523.25, at: 0, dur: 0.14, type: 'triangle' },
  { freq: 659.25, at: 0.09, dur: 0.14, type: 'triangle' },
  { freq: 783.99, at: 0.18, dur: 0.16, type: 'triangle' },
  { freq: 1046.5, at: 0.27, dur: 0.34, type: 'triangle', gain: 0.085 },
])

/** Fuller fanfare when a vault fills. */
export const soundComplete = () => play([
  { freq: 659.25, at: 0, dur: 0.12, type: 'triangle' },
  { freq: 783.99, at: 0.08, dur: 0.12, type: 'triangle' },
  { freq: 987.77, at: 0.16, dur: 0.14, type: 'triangle' },
  { freq: 1318.5, at: 0.26, dur: 0.42, type: 'triangle', gain: 0.09 },
  { freq: 1567.98, at: 0.3, dur: 0.38, type: 'sine', gain: 0.05 },
])

/** Soft click for claiming a quest. */
export const soundClaim = () => play([
  { freq: 1046.5, at: 0, dur: 0.07, type: 'square', gain: 0.035 },
  { freq: 1396.9, at: 0.05, dur: 0.1, type: 'triangle', gain: 0.05 },
])

export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* Vibration is a nicety; a browser refusing it is not an error. */
  }
}
