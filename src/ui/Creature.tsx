/**
 * The companion: one dragon, hatchling to hoard-guardian.
 *
 * "Hoard" is a dragon's word before it is a saver's word, so the companion is
 * a single animal read across five stages rather than five unrelated mascots.
 * It hatches, grows the wings and crest it was always going to have, and ends
 * sitting on the gold it spent the whole game collecting.
 *
 * **It is drawn in the same language as every other mark in this app**: open
 * paths, one weight of `currentColor` line, no keyline, no cartoon fill. The
 * vault glyphs next to it are 1.6-weight strokes on a 24 grid; this is the
 * same hand at a larger size. An earlier pass drew a thick black outline
 * around flat fill with a smiley face on it, and however carefully the anatomy
 * was corrected it stayed clip art, because the anatomy was never the problem
 * — the drawing belonged to a different app.
 *
 * The construction, held across all five forms:
 *
 *  - **Body, neck and head are one silhouette.** A head placed over a body
 *    leaves a seam across the throat no matter how it is positioned.
 *  - **Appendages are open paths that land on that silhouette**, so nothing
 *    overlaps and nothing has to be hidden.
 *  - **One wash for the whole animal**, grouped and given its opacity as a
 *    group, so overlapping shapes composite once into a flat tint instead of
 *    stacking into darker patches.
 *  - **A crest of spines down the nape.** More than any horn, this is what
 *    stops a long neck reading as a swan — which is exactly what it read as
 *    until the spines went on.
 *  - **Wing scallop tips are offset perpendicular from the leading edge**, so
 *    the membrane has real area. Tips placed near that edge collapse the wing
 *    into a spike that reads as an ear.
 *
 * Everything is `currentColor`, so the dragon wears the player's accent type
 * and the gold reads as gold by its shape rather than by breaking the palette.
 */

import { createContext, useContext } from 'react'

export type Stage = 0 | 1 | 2 | 3 | 4

export const STAGE_AT_LEVEL: Array<{ level: number; stage: Stage; name: string }> = [
  { level: 1, stage: 0, name: 'Sprig' },
  { level: 6, stage: 1, name: 'Kitling' },
  { level: 15, stage: 2, name: 'Drakelet' },
  { level: 28, stage: 3, name: 'Wyrm' },
  { level: 45, stage: 4, name: 'Sovereign' },
]

export function stageForLevel(level: number): Stage {
  let out: Stage = 0
  for (const s of STAGE_AT_LEVEL) if (level >= s.level) out = s.stage
  return out
}

export function stageName(stage: Stage): string {
  return STAGE_AT_LEVEL[stage]?.name ?? 'Sprig'
}

export function nextStage(level: number): { level: number; name: string } | null {
  return STAGE_AT_LEVEL.find((s) => s.level > level) ?? null
}

type Props = { stage: Stage; size?: number; className?: string; title?: string }

/* ------------------------------------------------------------- materials */

const W_MAIN = 2.6
const W_FINE = 1.5
const WASH = 0.13

/** A shape that takes both the wash and the ink. */
type Shape = { d: string; w?: number; o?: number }

/* ------------------------------------------------------------------ parts */

/** The canonical silhouette: body, neck and head in one continuous contour. */
const BODY = 'M80 42C75 45 70 46 65 46C61 46 58 50 57 55C62 60 64 68 63 75C62 82 54 86 44 86C33 86 26 78 26 67C26 56 32 46 42 44C48 43 51 39 53 34C55 29 61 26 67 29C73 32 78 38 80 42Z'

/** Crests, growing down the nape as the animal does. */
const CREST_SMALL = 'M52 37L47 30L56 32M47 43L43 36L52 39'
const CREST = 'M52 37L45 27L56 31M47 43L41 34L52 38M42 46L37 39L47 43'
const CREST_TALL = 'M52 37L43 24L56 31M47 43L39 32L52 38M42 46L35 37L47 43M37 52L31 44L42 47'

/**
 * Wings, as open paths rooted on the back contour. `Q` points are the scallop
 * tips; they sit well off the leading edge so the membrane has area.
 */
const WING_BUD = 'M42 46C39 43 34 38 30 34Q33 39 30 43Q35 45 35 49Q38 47 41 48'
const WING_SMALL = 'M42 45C37 40 27 31 20 24Q24 32 19 39Q27 43 26 50Q33 46 33 47'
const WING = 'M42 44C35 38 18 26 8 16Q14 26 8 35Q19 40 18 48Q26 45 32 46'
const WING_WIDE = 'M42 44C34 37 16 23 5 12Q12 24 4 34Q17 40 15 50Q25 45 32 46'
const WING_FAR = 'M45 46C39 41 28 32 21 25Q24 32 20 38Q28 41 28 47Q35 44 39 46'
const WING_FAR_WIDE = 'M45 46C38 40 25 28 17 20Q21 29 16 36Q26 40 25 48Q34 44 39 46'

const TAIL = 'M28 83C20 87 9 84 7 74C6 66 12 60 17 62C13 65 12 70 15 74C19 79 25 80 29 76'

/** The eggshell the hatchling is still sitting in. */
const SHELL = 'M24 60C24 75 35 88 48 88C61 88 72 75 72 60C68 64 63 58 59 63C55 57 50 65 46 59C42 65 37 57 33 63C30 58 27 64 24 60Z'

/** Interior marks on the head. Ink only — they sit clear of every contour. */
function HeadMarks() {
  return (
    <>
      <path strokeWidth={W_FINE} d="M65 44C69 43 74 42 78 41" />
      <path strokeWidth={W_FINE} d="M62 33C65 32 68 33 70 35" />
      <path strokeWidth={W_FINE} d="M76 40C77 40 78 41 78 42" />
      <circle cx="66" cy="36" r="1.8" fill="currentColor" stroke="none" />
    </>
  )
}

/** Belly plate, scutes and haunch — the marks that give the body volume. */
function BodyMarks() {
  return (
    <>
      <path strokeWidth={W_FINE} d="M56 62C60 66 62 71 61 77C60 82 55 85 50 85" />
      <path strokeWidth={W_FINE} d="M50 68C54 70 57 70 60 68M50 77C53 79 57 79 60 77" />
      <path strokeWidth={W_FINE} d="M31 70C31 79 36 85 44 86" />
    </>
  )
}

/**
 * Below this rendered size the interior marks stop being detail and start
 * being noise — belly scutes a pixel apart just grey the animal in. Under it
 * the figure draws as silhouette and contour only, which is what survives.
 */
const DETAIL_FROM = 40

/** Set by `Creature` so every figure can decide how much detail to carry. */
const SizeContext = createContext(64)

/**
 * Draws one figure: every shape gets the wash, then the same shapes get the
 * ink, then ink-only detail on top. `k` scales the whole figure, and stroke
 * widths are divided by it so line weight stays constant across the five
 * stages rather than thinning as the animal gets smaller.
 */
function Figure({ shapes, k = 1, dx = 0, dy = 0, children }: {
  shapes: Shape[]
  k?: number
  dx?: number
  dy?: number
  children?: React.ReactNode
}) {
  const detailed = useContext(SizeContext) >= DETAIL_FROM
  return (
    <g transform={`translate(${dx} ${dy}) scale(${k})`}>
      <g opacity={WASH} fill="currentColor" stroke="none">
        {shapes.map((s, i) => <path key={i} d={s.d} />)}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={W_MAIN / k}
         strokeLinecap="round" strokeLinejoin="round">
        {shapes.map((s, i) => (
          <path key={i} d={s.d} strokeWidth={(s.w ?? W_MAIN) / k} opacity={s.o} />
        ))}
        {detailed && <g strokeWidth={W_FINE / k}>{children}</g>}
      </g>
    </g>
  )
}

/* ------------------------------------------------------------------ forms */

/** Lv1 — just out, still sitting in the shell it broke. */
function Hatchling() {
  return (
    <Figure k={0.66} dx={16} dy={16} shapes={[
      { d: WING_BUD, w: W_FINE },
      { d: CREST_SMALL, w: W_FINE },
      { d: BODY },
      { d: SHELL },
    ]}>
      <HeadMarks />
      {/* cracks across the shell, which the body sits down inside */}
      <path d="M40 70V78M48 73V81M56 70V78" opacity={0.7} />
    </Figure>
  )
}

/** Lv6 — out of the shell and up, wings still small. */
function Whelp() {
  return (
    <Figure k={0.82} dx={9} dy={8} shapes={[
      { d: WING_SMALL },
      { d: TAIL },
      { d: CREST_SMALL, w: W_FINE },
      { d: BODY },
    ]}>
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv15 — proportions settle. The form the others are read against. */
function Drake() {
  return (
    <Figure k={0.93} dx={3} dy={3} shapes={[
      { d: WING_FAR, w: W_FINE, o: 0.55 },
      { d: WING },
      { d: TAIL },
      { d: CREST, w: W_FINE },
      { d: BODY },
    ]}>
      <path strokeWidth={W_FINE} d="M8 16L8 35M8 16L18 48" />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv28 — grown. The span opens out, and the first coins appear under it. */
function Wyrm() {
  return (
    <Figure shapes={[
      { d: WING_FAR_WIDE, w: W_FINE, o: 0.55 },
      { d: WING_WIDE },
      { d: TAIL },
      { d: CREST_TALL, w: W_FINE },
      { d: BODY },
      { d: 'M14 88a7 3.4 0 1 0 14 0a7 3.4 0 1 0-14 0', w: W_FINE },
      { d: 'M28 91a7 3.4 0 1 0 14 0a7 3.4 0 1 0-14 0', w: W_FINE },
    ]}>
      <path strokeWidth={W_FINE} d="M5 12L4 34M5 12L15 50" />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv45 — the guardian, sat on the hoard it kept. */
function Sovereign() {
  return (
    <Figure k={1.04} dx={-2} dy={-3} shapes={[
      { d: WING_FAR_WIDE, w: W_FINE, o: 0.55 },
      { d: WING_WIDE },
      { d: TAIL },
      { d: CREST_TALL, w: W_FINE },
      { d: BODY },
      /* the hoard: a bank of coin under the whole animal */
      { d: 'M6 92C6 85 18 80 33 80C50 80 63 84 66 89C67 92 63 94 52 94H14C8 94 6 93 6 92Z' },
      { d: 'M12 85a8 3.8 0 1 0 16 0a8 3.8 0 1 0-16 0', w: W_FINE },
      { d: 'M30 88a8 3.8 0 1 0 16 0a8 3.8 0 1 0-16 0', w: W_FINE },
      { d: 'M48 85a8 3.8 0 1 0 16 0a8 3.8 0 1 0-16 0', w: W_FINE },
    ]}>
      <path strokeWidth={W_FINE} d="M5 12L4 34M5 12L15 50" />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

const FORMS = [Hatchling, Whelp, Drake, Wyrm, Sovereign]

export function Creature({ stage, size = 64, className, title }: Props) {
  const Form = FORMS[stage] ?? FORMS[0]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <SizeContext.Provider value={size}><Form /></SizeContext.Provider>
    </svg>
  )
}
