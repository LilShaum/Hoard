/**
 * The companion: one dragon, hatchling to hoard-guardian.
 *
 * "Hoard" is a dragon's word before it is a saver's word — so the companion
 * is a single animal read across five stages, not five unrelated mascots.
 * It hatches (a shell chip still stuck to its head, no horns worth the name
 * yet), grows the wings and horns it was always going to have, and by the
 * final stage sits in front of the coins it has actually started to keep —
 * the pile at its feet is the first literal treasure in the piece, saved for
 * the form that has earned a reason to guard something.
 *
 * Every stage is a front-facing, symmetric silhouette — an emblem rather than
 * an illustration — because that is what survives being 28px in a header and
 * 120px on the rank screen, and because a symmetric build lets one animal
 * stay coherent across five increasingly elaborate forms.
 *
 * Every fill takes `currentColor` so the dragon wears the player's accent
 * type; only the eggshell and the coins keep a fixed tone, because a shell
 * and a coin have their own colour regardless of what the dragon's is. Depth
 * comes from flat, semi-transparent overlays layered on top — a shadow wash
 * low and to the left, a highlight wash high and to the right, as if lit from
 * one steady source — never a gradient. A dark hairline outline holds every
 * shape together, and each eye carries a small catchlight so the form reads
 * as looking back at you rather than printed on a badge.
 */

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

/* ---------------------------------------------------------------- shading */
// One light source, always: low-left shadow, high-right shine. Flat washes,
// never a gradient — see src/__tests__/house-style.test.ts.
const INK = 'rgba(17,13,10,0.86)'      // outline
const PUPIL = 'rgba(14,11,9,0.9)'
const SHADE = 'rgba(0,0,0,0.17)'        // volume, cast low-left
const SHADE_SOFT = 'rgba(0,0,0,0.1)'
const HILITE = 'rgba(255,255,255,0.4)'  // shine, cast high-right
const HILITE_SOFT = 'rgba(255,255,255,0.24)'
const SPARK = '#ffffff'                 // eye catchlight, always opaque
const SHELL = '#f2e9d6'                 // eggshell — its own colour, not the dragon's
const SHELL_SHADE = 'rgba(0,0,0,0.12)'
const GOLD = '#eda100'                  // the hoard, always this gold — the one validated
const GOLD_LINE = 'rgba(90,55,0,0.55)'  // amber-leaning outline so coins don't read as ink-black holes
const W = 1.9

/** Both eyes: a dark iris plus a small fixed catchlight so the form looks alive. */
function Eyes({ y, gap = 11.5, r = 2.9 }: { y: number; gap?: number; r?: number }) {
  const cx1 = 32 - gap / 2
  const cx2 = 32 + gap / 2
  return (
    <g>
      <circle cx={cx1} cy={y} r={r} fill={PUPIL} />
      <circle cx={cx2} cy={y} r={r} fill={PUPIL} />
      <circle cx={cx1 - r * 0.32} cy={y - r * 0.38} r={r * 0.36} fill={SPARK} />
      <circle cx={cx2 - r * 0.32} cy={y - r * 0.38} r={r * 0.36} fill={SPARK} />
    </g>
  )
}

/* -------------------------------------------------------------- Lv1 Sprig */
// The hatchling. Round, wingless, a chip of its shell still stuck to its
// head — the horns are two blunt nubs, not yet the real thing.
function Sprig() {
  return (
    <g strokeLinejoin="round">
      {/* wing buds — barely there yet */}
      <path d="M16 42C13 40 12 36 14 33C15 36 17 38 19 39C18 40 17 41 16 42Z"
            fill="currentColor" stroke={INK} strokeWidth="1.5" />
      <path d="M48 42C51 40 52 36 50 33C49 36 47 38 45 39C46 40 47 41 48 42Z"
            fill="currentColor" stroke={INK} strokeWidth="1.5" />

      {/* tail nub */}
      <path d="M45 52C49 52 51 49 50 45C49 47 47 49 44 50Z"
            fill="currentColor" stroke={INK} strokeWidth="1.5" />

      {/* stub feet */}
      <ellipse cx="24" cy="57" rx="4.6" ry="3.2" fill="currentColor" stroke={INK} strokeWidth={W} />
      <ellipse cx="40" cy="57" rx="4.6" ry="3.2" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* body */}
      <circle cx="32" cy="41" r="18" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M15 45A17 17 0 0 0 26 58.5A19 19 0 0 1 15 45Z" fill={SHADE} />
      <path d="M45 34A17 17 0 0 1 38 23.5A19 19 0 0 1 45 34Z" fill={HILITE} />
      <ellipse cx="32" cy="47" rx="10.5" ry="9" fill={HILITE_SOFT} />

      {/* horn nubs, under the shell */}
      <path d="M27 24C26.5 21 27.5 19 29.5 18.5C28.5 20.5 28.5 22.5 29.5 24.5Z"
            fill="currentColor" stroke={INK} strokeWidth="1.4" />
      <path d="M37 24C37.5 21 36.5 19 34.5 18.5C35.5 20.5 35.5 22.5 34.5 24.5Z"
            fill="currentColor" stroke={INK} strokeWidth="1.4" />

      <Eyes y={39} />
      <path d="M28 46.5C29.5 48.5 34.5 48.5 36 46.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* the eggshell it hatched from, still perched on its head */}
      <path d="M20 22C22 14 27 10 32 10C37 10 42 14 44 22C40 19 38 23 35 20C33 24 31 24 29 20C26 23 24 19 20 22Z"
            fill={SHELL} stroke={INK} strokeWidth="1.7" />
      <path d="M25 16L27 19M32 13.5V17M39 16L37 19" stroke={SHELL_SHADE} strokeWidth="1.1" strokeLinecap="round" />
    </g>
  )
}

/* ------------------------------------------------------------ Lv6 Kitling */
// The whelp. Still round, but the shell is gone — real horns and the first
// fold of wing are coming in, and there's a proper tail now, not a nub.
function Kitling() {
  return (
    <g strokeLinejoin="round">
      {/* tail, tapered */}
      <path d="M45 50C53 50 57 43 55 35C54 41 50 46 43 46Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M52 38C53 41 52 44 49 46" fill="none" stroke={SHADE} strokeWidth="1.4" strokeLinecap="round" />

      {/* wings, small and folded */}
      <path d="M19 42C13 40 10 34 12 28C15 32 18 35 21 37C20 39 19 40 19 42Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M45 42C51 40 54 34 52 28C49 32 46 35 43 37C44 39 45 40 45 42Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M15 31C17 34 19 36 20 37" fill="none" stroke={SHADE} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M49 31C47 34 45 36 44 37" fill="none" stroke={HILITE_SOFT} strokeWidth="1.1" strokeLinecap="round" />

      {/* horns, short and curved */}
      <path d="M23 18C21 13 22 9 26 8C24 11 24 15 26 18Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M41 18C43 13 42 9 38 8C40 11 40 15 38 18Z" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* body */}
      <ellipse cx="32" cy="46" rx="14.5" ry="13" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M18 49A14.5 13 0 0 0 27 58.5A16 15 0 0 1 18 49Z" fill={SHADE} />
      <ellipse cx="32" cy="49" rx="7.5" ry="7" fill={HILITE_SOFT} />

      {/* head */}
      <circle cx="32" cy="28" r="14.5" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M18.5 31A14.5 14.5 0 0 0 26 41A16 16 0 0 1 18.5 31Z" fill={SHADE} />
      <path d="M45.5 25A14.5 14.5 0 0 1 39 15A16 16 0 0 1 45.5 25Z" fill={HILITE} />

      {/* muzzle */}
      <ellipse cx="32" cy="34" rx="7" ry="5" fill={HILITE_SOFT} />
      <Eyes y={26} gap={13} r={3} />
      <path d="M32 32.5V35.5" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M28 37.5Q32 40 36 37.5" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </g>
  )
}

/* ----------------------------------------------------------- Lv15 Drakelet */
function Drakelet() {
  return (
    <g strokeLinejoin="round">
      {/* wings, folded — attached at the shoulder, not the head, so they read
          as wings rather than a second pair of ears */}
      <path d="M21 32C13 30 8 23 9 14C13 19 17 22 21 24C19 27 20 30 21 32Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M43 32C51 30 56 23 55 14C51 19 47 22 43 24C45 27 44 30 43 32Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M13 18C16 21 18 23 20 24" fill="none" stroke={SHADE} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M51 18C48 21 46 23 44 24" fill="none" stroke={HILITE_SOFT} strokeWidth="1.2" strokeLinecap="round" />

      {/* tail, one side */}
      <path d="M40 57C48 58 55 53 55 46C51 50 45 51 40 49Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* legs */}
      <ellipse cx="25" cy="58" rx="4.4" ry="3.4" fill="currentColor" stroke={INK} strokeWidth={W} />
      <ellipse cx="39" cy="58" rx="4.4" ry="3.4" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* body */}
      <ellipse cx="32" cy="43" rx="14.5" ry="15" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M18 47A14.5 15 0 0 0 27 59.5A16 16.5 0 0 1 18 47Z" fill={SHADE} />
      <path d="M46 39A14.5 15 0 0 1 39 28A16 16.5 0 0 1 46 39Z" fill={HILITE} />
      {/* segmented belly plate */}
      <path d="M25 42Q32 46 39 42" stroke={SHADE_SOFT} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M26 48Q32 52 38 48" stroke={SHADE_SOFT} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="47" rx="8" ry="9.5" fill={HILITE_SOFT} />

      {/* horns */}
      <path d="M22 19L18 8L28 15Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M42 19L46 8L36 15Z" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* head */}
      <ellipse cx="32" cy="24" rx="13" ry="11.5" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M19.5 27A13 11.5 0 0 0 27 34.5A14.5 13 0 0 1 19.5 27Z" fill={SHADE} />
      <path d="M44.5 22A13 11.5 0 0 1 38 13.5A14.5 13 0 0 1 44.5 22Z" fill={HILITE} />
      <ellipse cx="32" cy="29" rx="6.5" ry="5" fill={HILITE_SOFT} />

      <Eyes y={22} gap={13.5} r={2.9} />
      <path d="M27.5 29.5C29 31.2 35 31.2 36.5 29.5" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </g>
  )
}

/* --------------------------------------------------------------- Lv28 Wyrm */
function Wyrm() {
  return (
    <g strokeLinejoin="round">
      {/* wings, spread */}
      <path d="M21 33C10 31 3 22 3 11C10 17 15 21 20 23C18 26 19 30 21 33Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M43 33C54 31 61 22 61 11C54 17 49 21 44 23C46 26 45 30 43 33Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M9 16C13 20 17 22 19 24M11 24C14 26 17 27.5 19 28.5"
            fill="none" stroke={SHADE} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M55 16C51 20 47 22 45 24M53 24C50 26 47 27.5 45 28.5"
            fill="none" stroke={HILITE_SOFT} strokeWidth="1.2" strokeLinecap="round" />

      {/* tail, S-curve */}
      <path d="M32 58C42 60 53 55 55 46C50 51 41 52 35 49C38 52 37 56 32 58Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* body */}
      <ellipse cx="32" cy="44" rx="15" ry="15.5" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M17 48A15 15.5 0 0 0 27 60.5A16.5 17 0 0 1 17 48Z" fill={SHADE} />
      <path d="M47 40A15 15.5 0 0 1 39 28.5A16.5 17 0 0 1 47 40Z" fill={HILITE} />
      <path d="M24 43Q32 48 40 43" stroke={SHADE_SOFT} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M25 50Q32 55 39 50" stroke={SHADE_SOFT} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <ellipse cx="32" cy="48" rx="8.5" ry="10" fill={HILITE_SOFT} />

      {/* neck + spine ridge */}
      <path d="M26 35C26 27 28 21 32 21C36 21 38 27 38 35Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M30 22L32 17L34 22Z" fill="currentColor" stroke={INK} strokeWidth="1.4" />
      <path d="M28.5 24.5L30 20L31.5 24.5Z" fill="currentColor" stroke={INK} strokeWidth="1.2" />
      <path d="M32.5 24.5L34 20L35.5 24.5Z" fill="currentColor" stroke={INK} strokeWidth="1.2" />

      {/* horns, curved */}
      <path d="M21 18C18 12 19 6 24 4C22 9 23 14 26 17Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M43 18C46 12 45 6 40 4C42 9 41 14 38 17Z" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* head */}
      <ellipse cx="32" cy="22" rx="12.5" ry="10.5" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M20 25A12.5 10.5 0 0 0 27 32A14 12 0 0 1 20 25Z" fill={SHADE} />
      <path d="M44 20A12.5 10.5 0 0 1 38 11.5A14 12 0 0 1 44 20Z" fill={HILITE} />
      <ellipse cx="32" cy="26" rx="6" ry="4.5" fill={HILITE_SOFT} />

      <Eyes y={20} gap={13.5} r={2.7} />
      <path d="M27.5 27C29 28.7 35 28.7 36.5 27" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </g>
  )
}

/* ----------------------------------------------------------- Lv45 Sovereign */
function Sovereign() {
  return (
    <g strokeLinejoin="round">
      {/* wings, full spread, two membranes each side */}
      <path d="M22 34C9 33 1 24 0 8C8 16 14 21 20 23C17 27 19 31 22 34Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M22 34C13 34 6 28 3 18C10 25 16 28 21 29Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M42 34C55 33 63 24 64 8C56 16 50 21 44 23C47 27 45 31 42 34Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M42 34C51 34 58 28 61 18C54 25 48 28 43 29Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M8 14C13 19 17 22 20 24M6 21C11 25 15 27 19 28.5"
            fill="none" stroke={SHADE} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 14C51 19 47 22 44 24M58 21C53 25 49 27 45 28.5"
            fill="none" stroke={HILITE_SOFT} strokeWidth="1.2" strokeLinecap="round" />

      {/* tail, flourished */}
      <path d="M32 59C46 62 59 56 61 44C54 51 43 53 35 50C39 53 38 57 32 59Z"
            fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* body */}
      <ellipse cx="32" cy="45" rx="16" ry="15.5" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M16 49A16 15.5 0 0 0 27 61.5A17.5 17 0 0 1 16 49Z" fill={SHADE} />
      <path d="M48 41A16 15.5 0 0 1 39 29A17.5 17 0 0 1 48 41Z" fill={HILITE} />
      <path d="M23 44Q32 49 41 44" stroke={SHADE_SOFT} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M24 51Q32 56 40 51" stroke={SHADE_SOFT} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* chest emblem */}
      <path d="M32 39L36 45L32 51L28 45Z" fill={HILITE} stroke={INK} strokeWidth="1.3" />

      {/* neck */}
      <path d="M26 35C26 25 28 19 32 19C36 19 38 25 38 35Z" fill="currentColor" stroke={INK} strokeWidth={W} />

      {/* crown */}
      <path d="M19 17L12 2L26 12Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M45 17L52 2L38 12Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M32 8L27 15H37Z" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M20 12L16 5L24 10Z" fill={SHADE} />
      <path d="M44 12L48 5L40 10Z" fill={HILITE_SOFT} />

      {/* head */}
      <ellipse cx="32" cy="21" rx="13.5" ry="11" fill="currentColor" stroke={INK} strokeWidth={W} />
      <path d="M19 24.5A13.5 11 0 0 0 27 31.5A15 12.5 0 0 1 19 24.5Z" fill={SHADE} />
      <path d="M45 19A13.5 11 0 0 1 38 10.5A15 12.5 0 0 1 45 19Z" fill={HILITE} />
      <ellipse cx="32" cy="25" rx="6.5" ry="5" fill={HILITE_SOFT} />

      <Eyes y={19} gap={14} r={2.9} />
      <path d="M27.5 26.5C29 28.3 35 28.3 36.5 26.5" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />

      {/* the hoard — every earlier stage was working towards standing over this */}
      <ellipse cx="22" cy="60" rx="4.6" ry="3" fill={GOLD} stroke={GOLD_LINE} strokeWidth="1.3" />
      <ellipse cx="30" cy="62.3" rx="4.9" ry="3.1" fill={GOLD} stroke={GOLD_LINE} strokeWidth="1.3" />
      <ellipse cx="41" cy="60.3" rx="4.6" ry="3" fill={GOLD} stroke={GOLD_LINE} strokeWidth="1.3" />
      <path d="M35.5 56.5L38.5 60L35.5 63.5L32.5 60Z" fill={GOLD} stroke={GOLD_LINE} strokeWidth="1.2" />
      <path d="M19.5 59.5L25 59M27 61.7L33.5 61.2M36.5 58L39.5 59.6"
            stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
    </g>
  )
}

const FORMS = [Sprig, Kitling, Drakelet, Wyrm, Sovereign]

export function Creature({ stage, size = 64, className, title }: Props) {
  const Form = FORMS[stage] ?? FORMS[0]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Form />
    </svg>
  )
}
