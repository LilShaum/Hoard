/** Tiny scale helpers — the 20 lines of d3 a hand-rolled chart actually needs. */

export type Scale = (v: number) => number

export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  const span = d1 - d0
  if (span === 0) return () => (r0 + r1) / 2
  return (v) => r0 + ((v - d0) / span) * (r1 - r0)
}

/** Rounds a maximum up to a readable axis top: 1, 2, 2.5 or 5 × a power of ten. */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1
  const exp = Math.floor(Math.log10(max))
  const pow = Math.pow(10, exp)
  const frac = max / pow
  const step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10
  return step * pow
}

/** Catmull-Rom → cubic Bézier. Curved lines without a smoothing library. */
export function smoothPath(points: Array<[number, number]>, tension = 0.42): string {
  if (points.length === 0) return ''
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')

  let dPath = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
    dPath += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return dPath
}
