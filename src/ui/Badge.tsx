/**
 * Achievement badges.
 *
 * Ten geometric shapes rather than ten pictures: at 32px a shape reads
 * instantly and a tiny illustration does not, and a shared silhouette makes a
 * wall of forty badges look like one collection instead of a sticker sheet.
 * Shape carries the family, the ring colour carries the tier.
 */

export type BadgeShape =
  | 'hex' | 'shield' | 'diamond' | 'drop' | 'gear'
  | 'star' | 'chevron' | 'ring' | 'bolt' | 'flame'

const SHAPES: Record<BadgeShape, string> = {
  hex:     'M16 2.6 27.6 9.3v13.4L16 29.4 4.4 22.7V9.3z',
  shield:  'M16 2.6 27.4 6.4v10.2C27.4 23 22.4 27.6 16 29.4 9.6 27.6 4.6 23 4.6 16.6V6.4z',
  diamond: 'M16 2.4 29.6 16 16 29.6 2.4 16z',
  drop:    'M16 2.4c5.6 6.1 9.6 10.6 9.6 15.4A9.6 9.6 0 0 1 6.4 17.8C6.4 13 10.4 8.5 16 2.4z',
  gear:    'M13.4 2.6h5.2l.7 3.4 2.6 1.5 3.2-1.3 2.6 4.5-2.5 2.4v3l2.5 2.4-2.6 4.5-3.2-1.3-2.6 1.5-.7 3.4h-5.2l-.7-3.4-2.6-1.5-3.2 1.3-2.6-4.5 2.5-2.4v-3L4.3 10.7l2.6-4.5 3.2 1.3 2.6-1.5z',
  star:    'M16 2.2l3.9 8.9 9.7 1-7.3 6.4 2.1 9.5-8.4-4.9-8.4 4.9 2.1-9.5-7.3-6.4 9.7-1z',
  chevron: 'M16 2.4 29.6 12v7.4L16 9.8 2.4 19.4V12z M16 15.4 29.6 25v4.6L16 20 2.4 29.6V25z',
  ring:    'M16 2.4a13.6 13.6 0 1 1 0 27.2 13.6 13.6 0 0 1 0-27.2zm0 7.2a6.4 6.4 0 1 0 0 12.8 6.4 6.4 0 0 0 0-12.8z',
  bolt:    'M18.6 2.4 6.8 17.6h6.6L11.4 29.6 25.2 13.4h-7z',
  flame:   'M17.6 2.4c.6 4.6.4 6.6-2.2 9.4-2.1 2.3-3 4-3 6.1a5.3 5.3 0 0 0 2.1 4.2c-.3-2.6.8-4.6 2.7-6.1 0 2.3.8 3.5 2.6 5.2 1.7 1.5 2.4 3 2.4 4.8 0 3.5-3 6.3-7 6.3-4.7 0-8.4-3.6-8.4-8.6 0-3 1.1-5.4 3.6-8.6 3.5-4.5 6.2-7.4 7.2-12.7z',
}

export type BadgeTier = 1 | 2 | 3

type Props = {
  shape: BadgeShape
  tier: BadgeTier
  unlocked: boolean
  size?: number
  className?: string
}

export function Badge({ shape, tier, unlocked, size = 34, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`badge-art badge-art--t${tier} ${unlocked ? 'is-unlocked' : ''} ${className ?? ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={SHAPES[shape]} className="badge-art__fill" fillRule="evenodd" />
      <path d={SHAPES[shape]} className="badge-art__edge" fill="none" fillRule="evenodd" />
    </svg>
  )
}

export const BADGE_SHAPES = Object.keys(SHAPES) as BadgeShape[]
