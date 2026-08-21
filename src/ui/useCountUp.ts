import { useEffect, useRef, useState } from 'react'

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Eases a number towards its target on rAF. Money that snaps feels like a
 * spreadsheet; money that rolls feels like a score.
 */
export function useCountUp(target: number, duration = 620, enabled = true): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!enabled || prefersReduced() || fromRef.current === target) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    const delta = target - from
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutExpo — fast out of the gate, gentle landing.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setValue(Math.round(from + delta * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, enabled])

  return value
}

/** True once the component has been on screen for a tick — for entry animations. */
export function useMounted(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}
