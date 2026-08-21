/**
 * The companion.
 *
 * Five original forms, one per stage of the rank ladder. They are drawn as
 * front-facing, symmetric silhouettes — an emblem rather than an illustration —
 * because that is what survives being 28px in a header and 120px on the rank
 * screen, and because a symmetric build lets one set of shapes stay coherent
 * across five increasingly elaborate forms.
 *
 * Body fills take `currentColor` so a form wears the player's accent type;
 * the belly is the same hue lightened by a flat overlay, never a gradient.
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

const BELLY = 'rgba(255,255,255,0.42)'
const LINE = 'rgba(0,0,0,0.55)'

function Sprig() {
  return (
    <g>
      {/* leaves */}
      <path d="M32 27C32 27 24 26 21 20C18 14 24 11 27 14C30 17 32 21 32 27Z" fill="currentColor" opacity="0.75" />
      <path d="M32 27C32 27 40 26 43 20C46 14 40 11 37 14C34 17 32 21 32 27Z" fill="currentColor" opacity="0.9" />
      {/* body */}
      <ellipse cx="32" cy="42" rx="17" ry="16" fill="currentColor" />
      <ellipse cx="32" cy="46" rx="10.5" ry="10" fill={BELLY} />
      {/* face */}
      <circle cx="25.5" cy="39" r="2.6" fill={LINE} />
      <circle cx="38.5" cy="39" r="2.6" fill={LINE} />
      <path d="M29 45.5C30 47 34 47 35 45.5" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  )
}

function Kitling() {
  return (
    <g>
      {/* tail */}
      <path d="M46 48C53 47 56 41 53 35C52 40 49 43 45 43Z" fill="currentColor" opacity="0.85" />
      {/* ears */}
      <path d="M21 26L18 12L30 20Z" fill="currentColor" />
      <path d="M43 26L46 12L34 20Z" fill="currentColor" />
      {/* body */}
      <ellipse cx="32" cy="45" rx="14" ry="13" fill="currentColor" />
      <ellipse cx="32" cy="48" rx="8.5" ry="8" fill={BELLY} />
      {/* head */}
      <ellipse cx="32" cy="29" rx="14" ry="12.5" fill="currentColor" />
      <path d="M32 33C27 33 24 30.5 24 27.5C24 34 28 37 32 37C36 37 40 34 40 27.5C40 30.5 37 33 32 33Z" fill={BELLY} />
      {/* face */}
      <circle cx="26.5" cy="27" r="2.6" fill={LINE} />
      <circle cx="37.5" cy="27" r="2.6" fill={LINE} />
      <path d="M32 31.5L30 33.5H34Z" fill={LINE} />
    </g>
  )
}

function Drakelet() {
  return (
    <g>
      {/* wings */}
      <path d="M20 34C12 30 8 22 10 15C15 20 18 24 22 26Z" fill="currentColor" opacity="0.7" />
      <path d="M44 34C52 30 56 22 54 15C49 20 46 24 42 26Z" fill="currentColor" opacity="0.85" />
      {/* tail */}
      <path d="M32 54C40 56 48 53 50 46C45 49 39 49 34 47Z" fill="currentColor" opacity="0.8" />
      {/* body */}
      <ellipse cx="32" cy="43" rx="14" ry="15" fill="currentColor" />
      <ellipse cx="32" cy="46" rx="8.5" ry="10" fill={BELLY} />
      {/* horns */}
      <path d="M23 20L20 9L28 16Z" fill="currentColor" />
      <path d="M41 20L44 9L36 16Z" fill="currentColor" />
      {/* head */}
      <ellipse cx="32" cy="25" rx="13" ry="11" fill="currentColor" />
      <path d="M32 30C28 30 25 28 25 25C25 31 28 34 32 34C36 34 39 31 39 25C39 28 36 30 32 30Z" fill={BELLY} />
      <circle cx="26.5" cy="23" r="2.5" fill={LINE} />
      <circle cx="37.5" cy="23" r="2.5" fill={LINE} />
      <path d="M28 29.5H36" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

function Wyrm() {
  return (
    <g>
      {/* wings, scalloped */}
      <path d="M22 32C11 30 4 21 4 10C10 16 14 20 19 22C17 25 19 29 22 32Z" fill="currentColor" opacity="0.65" />
      <path d="M42 32C53 30 60 21 60 10C54 16 50 20 45 22C47 25 45 29 42 32Z" fill="currentColor" opacity="0.85" />
      {/* tail */}
      <path d="M32 56C43 59 54 54 56 44C50 49 41 51 34 48Z" fill="currentColor" opacity="0.8" />
      {/* body */}
      <ellipse cx="32" cy="44" rx="15" ry="15" fill="currentColor" />
      <ellipse cx="32" cy="47" rx="9" ry="10" fill={BELLY} />
      {/* neck + head */}
      <path d="M27 34C27 26 29 21 32 21C35 21 37 26 37 34Z" fill="currentColor" />
      <path d="M21 17L17 5L27 13Z" fill="currentColor" />
      <path d="M43 17L47 5L37 13Z" fill="currentColor" />
      <ellipse cx="32" cy="22" rx="12.5" ry="10.5" fill="currentColor" />
      <path d="M32 27C28 27 25.5 25 25.5 22C25.5 28 28.5 31 32 31C35.5 31 38.5 28 38.5 22C38.5 25 36 27 32 27Z" fill={BELLY} />
      <circle cx="26.8" cy="20" r="2.4" fill={LINE} />
      <circle cx="37.2" cy="20" r="2.4" fill={LINE} />
      <path d="M28.5 26.5H35.5" stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
}

function Sovereign() {
  return (
    <g>
      {/* full spread wings */}
      <path d="M23 34C10 33 2 24 1 8C9 16 15 21 21 23C18 27 20 31 23 34Z" fill="currentColor" opacity="0.6" />
      <path d="M23 34C14 34 7 28 4 18C11 25 17 28 22 29Z" fill="currentColor" opacity="0.85" />
      <path d="M41 34C54 33 62 24 63 8C55 16 49 21 43 23C46 27 44 31 41 34Z" fill="currentColor" opacity="0.75" />
      <path d="M41 34C50 34 57 28 60 18C53 25 47 28 42 29Z" fill="currentColor" />
      {/* tail */}
      <path d="M32 57C45 61 58 55 60 43C53 50 42 52 34 49Z" fill="currentColor" opacity="0.8" />
      {/* body */}
      <ellipse cx="32" cy="44" rx="16" ry="15" fill="currentColor" />
      <ellipse cx="32" cy="47" rx="9.5" ry="10" fill={BELLY} />
      {/* crown of horns */}
      <path d="M20 16L14 3L26 12Z" fill="currentColor" />
      <path d="M44 16L50 3L38 12Z" fill="currentColor" />
      <path d="M32 9L28 15H36Z" fill="currentColor" />
      {/* head */}
      <path d="M27 34C27 25 29 20 32 20C35 20 37 25 37 34Z" fill="currentColor" />
      <ellipse cx="32" cy="21" rx="13.5" ry="11" fill="currentColor" />
      <path d="M32 26C27.5 26 25 24 25 21C25 27.5 28.5 30.5 32 30.5C35.5 30.5 39 27.5 39 21C39 24 36.5 26 32 26Z" fill={BELLY} />
      <circle cx="26.5" cy="19" r="2.5" fill={LINE} />
      <circle cx="37.5" cy="19" r="2.5" fill={LINE} />
      <path d="M28 25.5H36" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
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
