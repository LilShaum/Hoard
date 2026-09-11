/**
 * Vault glyphs.
 *
 * Every one of these replaced an emoji. Emoji are somebody else's artwork,
 * render differently on every platform, and can't take the vault's type colour
 * — which in this interface is information, not decoration. These are drawn on
 * a single 24-unit grid with one stroke weight, so a row of them reads as one
 * set rather than a ransom note.
 *
 * They were redrawn once more to match `Icons.tsx`: butt caps and mitred
 * joins, corners left as corners, and the soft-cornered boxes (gift, phone,
 * camera, laptop, bag, ticket) squared off. A rounded cap is a small thing on
 * one glyph and the whole character of twenty of them. Curves survive only
 * where the object is a curve — a wheel, a lens, a ring, a coin.
 */

export type GlyphKey =
  | 'gift' | 'plane' | 'phone' | 'car' | 'ticket' | 'house' | 'cap' | 'ring'
  | 'camera' | 'bike' | 'guitar' | 'tent' | 'paw' | 'shoe' | 'laptop' | 'tools'
  | 'plant' | 'wave' | 'bag' | 'coin'

const PATHS: Record<GlyphKey, string | string[]> = {
  gift: [
    'M3.6 10.6h16.8V21H3.6z',
    'M2.4 6.6h19.2v4H2.4z',
    'M12 6.6V21',
    'M12 6.6 7.4 2.9v3.7zM12 6.6l4.6-3.7v3.7z',
  ],
  plane:  'M10.6 3.2h2.8V9l8 4.6v2.4l-8-2.3v4.1l2.6 1.8v1.7L12 20.5l-4.1 1.3v-1.7l2.6-1.8v-4.1l-8 2.3v-2.4l8-4.6z',
  phone: [
    'M5.4 2.6h13.2v18.8H5.4z',
    'M9.6 5.4h4.8M10.2 18.4h3.6',
  ],
  car: [
    'M2.6 14.6v-2.3l2.2-.5 2.5-3.9h9.4l2.5 3.9 2.2.5v2.3z',
    'M4.8 11.8h14.4',
    'M7.6 12.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z',
    'M16.4 12.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z',
  ],
  ticket: [
    'M2.6 7.4h18.8v2.8l-1.4 1.8 1.4 1.8v2.8H2.6v-2.8L4 12l-1.4-1.8z',
    'M9.6 7.4v9.2',
  ],
  house: [
    'M2.8 10.8 12 3.2l9.2 7.6V20.8H2.8z',
    'M9.4 20.8v-6h5.2v6',
  ],
  cap: [
    'M12 3.2 22.2 8 12 12.8 1.8 8z',
    'M6.2 10.6v5.2L12 18.4l5.8-2.6v-5.2',
    'M20.4 9.2v5.6',
  ],
  ring: [
    'M12 8.6a5.7 5.7 0 1 1 0 11.4 5.7 5.7 0 0 1 0-11.4z',
    'M7 5h10l-1.8 4.2M7 5l5 4.2L17 5',
  ],
  camera: [
    'M2.8 7.2h4l1.5-2.8h7.4l1.5 2.8h4v12.8H2.8z',
    'M12 9.6a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z',
  ],
  bike: [
    'M5.6 12.6a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6z',
    'M18.4 12.6a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6z',
    'M5.6 16.9h6.2L16 6.4h-2.6M16 6.4h1.8M8.8 10.6h7.4',
  ],
  guitar: [
    'M9.8 11.6a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8z',
    'M8.2 15.4h3.2v3.2H8.2z',
    'M13.4 13.1 18.9 7.6',
    'M17.9 6.6 20.5 4l1.6 1.6-2.6 2.6z',
  ],
  // A bare triangle reads as a hazard sign; the door is what makes it a tent.
  tent:   'M2.4 19.8h19.2M12 3.8 3.6 19.8M12 3.8l8.4 16M12 11.6 8.6 19.8M12 11.6l3.4 8.2',
  // Toes stay round. A toe pad with corners on it is not a paw, and the set
  // already keeps its curves for the things that are actually curved.
  paw: [
    'M12 12.6c2.7 0 5.4 2.4 5.4 4.9 0 1.9-1.5 2.9-3 2.9-1 0-1.7-.4-2.4-.4s-1.4.4-2.4.4c-1.5 0-3-1-3-2.9 0-2.5 2.7-4.9 5.4-4.9z',
    'M5.9 7.4a2.1 2.7 0 1 1 0 5.4 2.1 2.7 0 0 1 0-5.4z',
    'M18.1 7.4a2.1 2.7 0 1 1 0 5.4 2.1 2.7 0 0 1 0-5.4z',
    'M9.8 4.2a2.1 2.7 0 1 1 0 5.4 2.1 2.7 0 0 1 0-5.4z',
    'M14.2 4.2a2.1 2.7 0 1 1 0 5.4 2.1 2.7 0 0 1 0-5.4z',
  ],
  shoe: [
    'M2.4 17.6h16.9c1.2 0 2.1-.9 2.1-2.1 0-1.5-1.1-2.3-2.7-2.8l-4.6-1.5-2.6-4.2H6.9l-.6 4.8-3.9 2.7z',
    'M8 11.2 9.8 9.2M10.8 12.4l1.8-2',
  ],
  laptop: [
    'M4.4 5.4h15.2v10.2H4.4z',
    'M2.2 18.6h19.6l-1.4-3H3.6z',
  ],
  tools:  'M20.6 4.2a4.7 4.7 0 0 1-6.2 6.2l-8 8a2.1 2.1 0 0 1-3-3l8-8a4.7 4.7 0 0 1 6.2-6.2l-3 3 .3 2.7 2.7.3z',
  plant: [
    'M12 21.2V11.8',
    'M12 11.8c0-3.5 2.4-6.5 6.1-7.3.6 4-1.6 7.3-6.1 7.3z',
    'M12 14.4c-3.6 0-5.7-2.6-5.2-6.1 3.3.7 5.2 3.1 5.2 6.1z',
    'M7.4 21.2h9.2',
  ],
  wave:   'M2.4 9.4c2.4-2.6 4.8-2.6 7.2 0s4.8 2.6 7.2 0 3.6-2 4.8-1M2.4 15.4c2.4-2.6 4.8-2.6 7.2 0s4.8 2.6 7.2 0 3.6-2 4.8-1',
  bag: [
    'M4.2 7.4h15.6L21 20.8H3z',
    'M8.4 10V6.4h7.2V10',
  ],
  coin: [
    'M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8z',
    'M12 7.2v9.6',
    'M14.8 9.4h-5.6v2.8h5.6V15H9.2',
  ],
}

export const GLYPH_KEYS = Object.keys(PATHS) as GlyphKey[]

type Props = { name: GlyphKey; size?: number; className?: string; strokeWidth?: number }

export function Glyph({ name, size = 24, className, strokeWidth = 1.7 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit={6}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {(Array.isArray(PATHS[name]) ? (PATHS[name] as string[]) : [PATHS[name] as string]).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/** Names shown in the vault editor's icon picker. */
export const GLYPH_LABEL: Record<GlyphKey, string> = {
  gift: 'Gift', plane: 'Travel', phone: 'Phone', car: 'Car', ticket: 'Tickets',
  house: 'Home', cap: 'Study', ring: 'Ring', camera: 'Camera', bike: 'Bike',
  guitar: 'Music', tent: 'Camping', paw: 'Pet', shoe: 'Clothes', laptop: 'Tech',
  tools: 'Repairs', plant: 'Garden', wave: 'Rainy day', bag: 'Shopping', coin: 'General',
}
