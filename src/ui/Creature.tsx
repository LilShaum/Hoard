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
 *
 * **After editing any path here, run `node scripts/artgeom.mjs`.** Line art
 * looks rough for two measurable reasons, and both are invisible at 44px and
 * obvious at 300px: appendages whose ends do not quite meet the body, and
 * kinks inside curves that are meant to flow. The first draft of this drawing
 * had the foot floating four units clear of the body, the tail three, and the
 * lowest crest spine five; the throat carried a 50-degree corner. Every
 * endpoint below is now a point measured off the BODY contour rather than a
 * guess, which is why they are given to one decimal place.
 *
 * One weight rule, and it is the other half of looking finished: an outer
 * contour is always W_MAIN, an interior mark is always W_FINE. Nothing is
 * W_FINE merely because it is small.
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

const W_MAIN = 2.6   // every outer contour, at every stage
const W_FINE = 1.5   // interior marks only: scutes, brow, toes, wing bones
const WASH = 0.13    // the flat tint under the ink
const FAR = 0.36     // the far wing is the same line, set back

/** A shape that takes both the wash and the ink. */
type Shape = { d: string; w?: number; o?: number }

/* ------------------------------------------------------------------ parts */

/** The canonical silhouette: body, neck and head in one continuous contour. */
const BODY = 'M80 42C75 45 70 46 65 46C60 47 57 52 57 58C57 66 63 68 63 75C62 82 54 86 44 86C33 86 26 78 26 67C26 56 32 46 42 44C48 43 51 39 53 34C55 29 61 26 67 29C73 32 78 38 80 42Z'

/** Crests, growing down the nape as the animal does. */
const CREST_SMALL = 'M52.8 34.5Q50 32 48.4 28.5Q52.3 28.9 55.6 30.3M48.6 40.9Q46.2 38.5 45 35Q48.5 35.4 51.7 36.8'
const CREST = 'M52.8 34.5Q48.5 31 45.1 26.3Q51 27.5 55.6 30.3M48.6 40.9Q44.5 37.5 42.2 32.9Q47.5 34 51.7 36.8M41.7 44.1Q40.5 39.5 41.3 34.7Q43.5 37.5 46.5 42.4'
const CREST_TALL = 'M52.8 34.5Q48 30 42.6 24.6Q50 27 55.6 30.3M48.6 40.9Q43.5 36.5 39.8 31.1Q46.5 33.5 51.7 36.8M41.7 44.1Q40.3 39.5 41.3 34.7Q43.5 37.5 46.5 42.4M34.7 47.3Q33 42.5 32.1 37.3Q35.5 41 39.2 44.8'

/**
 * Wings, as open paths rooted on the back contour. `Q` points are the scallop
 * tips; they sit well off the leading edge so the membrane has area.
 */
const WING_BUD = 'M41.7 44.1C39 42 35 38 33 34Q35 40 32 43Q36 46 36.9 45.9'
const WING_SMALL = 'M41.7 44.1C37 40 27 31 20 24Q24 32 19 39Q27 43 26 50Q32 47 32.8 49'
const WING = 'M41.7 44.1C35 38 18 26 8 16Q14 26 8 35Q19 40 18 48Q26 46 32.8 49'
const WING_WIDE = 'M41.7 44.1C34 37 16 23 5 12Q12 24 4 34Q17 40 15 50Q25 46 32.8 49'
const WING_FAR = 'M44.2 43.5C38 42 24 37 14 32Q19 38 15 43Q24 45 24 50Q33 47 36.9 45.9'
const WING_FAR_WIDE = 'M44.2 43.5C37 41 21 34 10 28Q16 35 11 41Q22 44 21 50Q32 47 36.9 45.9'

const TAIL = 'M33.9 83.2C25 88 9 84 7 74C6 66 12 60 17 62C13 65 12 70 15 74C20 80 26 81 28.7 77.7'

/**
 * A front foot poking out at the base. Without it the animal is a bag with a
 * head on it — nothing touches the ground, so nothing has weight.
 */
const FOOT = 'M48.8 85.7C53 90 61 91 66 88C69 86 65 82 60.3 80.5'
const TOES = 'M56 89.4V86.8M61 88.2V85.6'

/** The eggshell the hatchling is still sitting in. */
const SHELL = 'M18 60C18 84 33 102 53 102C73 102 88 84 88 60C82 66 77 58 71 64C65 56 59 66 53 58C47 66 41 56 35 64C29 58 24 66 18 60Z'

/**
 * The hoard, drawn as stacks rather than discs. A lone ellipse outline in line
 * art reads as a ring or an egg; give it a side and a bottom and it is
 * unmistakably a stack of coin. Everything here stays strictly below the body
 * — the first attempt ran coins across the feet and it read as a puddle of
 * loops rather than a pile of gold.
 */
const STACK_TALL = 'M20 90a8 3.6 0 1 0 16 0a8 3.6 0 1 0-16 0M20 90v7a8 3.6 0 0 0 16 0v-7'
const STACK_SHORT = 'M41 93a7 3.2 0 1 0 14 0a7 3.2 0 1 0-14 0M41 93v5a7 3.2 0 0 0 14 0v-5'
const COIN_FLAT = 'M59 95a7.5 3.4 0 1 0 15 0a7.5 3.4 0 1 0-15 0'
const STACK_RIDGES = 'M20 93.5a8 3.6 0 0 0 16 0M41 95.5a7 3.2 0 0 0 14 0'

/** One stack and one loose coin, for the stage where the hoard is just starting. */
const COINS_FEW = 'M60 91a7.5 3.4 0 1 0 15 0a7.5 3.4 0 1 0-15 0M60 91v5a7.5 3.4 0 0 0 15 0v-5'
const COIN_ONE = 'M40 95a7 3.2 0 1 0 14 0a7 3.2 0 1 0-14 0'

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
    <Figure k={0.62} dx={17} dy={13} shapes={[
      { d: WING_BUD },
      { d: CREST_SMALL },
      { d: BODY },
      { d: SHELL },
    ]}>
      <HeadMarks />
    </Figure>
  )
}

/** Lv6 — out of the shell and up, wings still small. */
function Whelp() {
  return (
    <Figure k={0.82} dx={9} dy={8} shapes={[
      { d: WING_SMALL },
      { d: TAIL },
      { d: CREST_SMALL },
      { d: BODY },
      { d: FOOT },
    ]}>
      <path d={TOES} />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv15 — proportions settle. The form the others are read against. */
function Drake() {
  return (
    <Figure k={0.93} dx={3} dy={3} shapes={[
      { d: WING_FAR, o: FAR },
      { d: WING },
      { d: TAIL },
      { d: CREST },
      { d: BODY },
      { d: FOOT },
    ]}>
      <path d={TOES} />
      <path strokeWidth={W_FINE} d="M8 16L8 35M8 16L18 48" />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv28 — grown. The span opens out, and the first coins appear under it. */
function Wyrm() {
  return (
    <Figure k={0.94} dy={-6} shapes={[
      { d: WING_FAR_WIDE, o: FAR },
      { d: WING_WIDE },
      { d: TAIL },
      { d: CREST_TALL },
      { d: BODY },
      { d: FOOT },
      { d: COINS_FEW },
      { d: COIN_ONE },
    ]}>
      <path d={TOES} />
      <path strokeWidth={W_FINE} d="M5 12L4 34M5 12L15 50" />
      <HeadMarks />
      <BodyMarks />
    </Figure>
  )
}

/** Lv45 — the guardian, sat on the hoard it kept. */
function Sovereign() {
  return (
    <Figure k={0.95} dy={-9} shapes={[
      { d: WING_FAR_WIDE, o: FAR },
      { d: WING_WIDE },
      { d: TAIL },
      { d: CREST_TALL },
      { d: BODY },
      { d: FOOT },
      /* the hoard, spread along the floor beneath it */
      { d: STACK_TALL },
      { d: STACK_SHORT },
      { d: COIN_FLAT },
    ]}>
      <path d={STACK_RIDGES} />
      <path d={TOES} />
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
