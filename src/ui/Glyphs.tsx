/**
 * Vault glyphs.
 *
 * Every one of these replaced an emoji. Emoji are somebody else's artwork,
 * render differently on every platform, and can't take the vault's type colour
 * — which in this interface is information, not decoration. These are drawn on
 * a single 24-unit grid with one stroke weight, so a row of them reads as one
 * set rather than a ransom note.
 */

export type GlyphKey =
  | 'gift' | 'plane' | 'phone' | 'car' | 'ticket' | 'house' | 'cap' | 'ring'
  | 'camera' | 'bike' | 'guitar' | 'tent' | 'paw' | 'shoe' | 'laptop' | 'tools'
  | 'plant' | 'wave' | 'bag' | 'coin'

const PATHS: Record<GlyphKey, string | string[]> = {
  gift:   'M3.5 10.5h17v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1zM2.5 7h19v3.5h-19zM12 7v14M12 7S9.8 3 7.7 3.6 6.4 7 8.2 7zM12 7s2.2-4 4.3-3.4S17.6 7 15.8 7z',
  plane:  'M10.5 3.2a1.5 1.5 0 0 1 3 0V9l8 4.6v2.4l-8-2.3v4.1l2.6 1.8v1.7L12 20.5l-4.1 1.3v-1.7l2.6-1.8v-4.1l-8 2.3v-2.4L10.5 9z',
  phone:  'M6.5 2.8h11a1.7 1.7 0 0 1 1.7 1.7v15a1.7 1.7 0 0 1-1.7 1.7h-11a1.7 1.7 0 0 1-1.7-1.7v-15a1.7 1.7 0 0 1 1.7-1.7zM10 5.4h4M10.5 18.4h3',
  car: [
    'M2.8 14.4v-2l2.1-.5 2.3-3.6a2.1 2.1 0 0 1 1.8-1h6a2.1 2.1 0 0 1 1.8 1l2.3 3.6 2.1.5v2z',
    'M5 11.9h14',
    'M7.6 12.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z',
    'M16.4 12.9a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z',
  ],
  ticket: 'M3 8.2A1.2 1.2 0 0 1 4.2 7h15.6A1.2 1.2 0 0 1 21 8.2v2.3a2 2 0 0 0 0 3.9v2.4A1.2 1.2 0 0 1 19.8 18H4.2A1.2 1.2 0 0 1 3 16.8v-2.4a2 2 0 0 0 0-3.9zM9.5 7v11',
  house:  'M3.4 10.6 12 3.6l8.6 7v9.1a1 1 0 0 1-1 1h-4.4v-6.2H8.8v6.2H4.4a1 1 0 0 1-1-1z',
  cap:    'M12 3.5 22 8.4 12 13.3 2 8.4zM6 10.6v5.1c0 1.9 2.7 3.4 6 3.4s6-1.5 6-3.4v-5.1M20.4 9.2v5.4',
  ring:   'M12 8.6a5.7 5.7 0 1 1 0 11.4 5.7 5.7 0 0 1 0-11.4zM8.6 9.4 7 5.4h10l-1.6 4M7 5.4l5 4 5-4',
  camera: 'M3 8.4A1.4 1.4 0 0 1 4.4 7h2.7l1.4-2.6h6.9L16.9 7h2.7A1.4 1.4 0 0 1 21 8.4v10.2a1.4 1.4 0 0 1-1.4 1.4H4.4A1.4 1.4 0 0 1 3 18.6zM12 9.6a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4z',
  bike:   'M5.6 12.4a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zM18.4 12.4a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zM5.6 16.8h6.2L16 6.4M13.4 6.4h3.9M9 10.6h7.2',
  guitar: [
    'M9.8 11.6a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8z',
    'M9.8 15.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z',
    'M13.3 13.2 19 7.5',
    'M18.3 6.6 20.9 4l1.5 1.5-2.6 2.6z',
  ],
  tent:   'M2.4 19.6h19.2M12 4.4 3.4 19.6M12 4.4l8.6 15.2M12 9.6l5.4 10M12 9.6 6.6 19.6',
  paw:    'M12 12.6c2.6 0 5.4 2.4 5.4 4.9 0 1.9-1.5 2.9-3 2.9-1 0-1.7-.4-2.4-.4s-1.4.4-2.4.4c-1.5 0-3-1-3-2.9 0-2.5 2.8-4.9 5.4-4.9zM6.6 6.4c1.1 0 2 1.2 2 2.6s-.9 2.6-2 2.6-2-1.2-2-2.6.9-2.6 2-2.6zM17.4 6.4c1.1 0 2 1.2 2 2.6s-.9 2.6-2 2.6-2-1.2-2-2.6.9-2.6 2-2.6zM12 3.4c1.1 0 2 1.2 2 2.7s-.9 2.6-2 2.6-2-1.2-2-2.6.9-2.7 2-2.7z',
  shoe: [
    'M2.4 17.4h16.9a2.1 2.1 0 0 0 2.1-2.1c0-1.5-1.1-2.3-2.7-2.8l-4.6-1.5-2.4-3.9a1.4 1.4 0 0 0-1.2-.7H7.2a1 1 0 0 0-1 .9l-.5 4.4-3.3 2.4z',
    'M8.2 11.1 9.9 9.2M10.9 12.3l1.6-1.8',
  ],
  laptop: 'M4.6 5.6h14.8v10H4.6zM2.4 18.4h19.2l-1.2-2.8H3.6z',
  tools:  'M20.4 4.4a4.7 4.7 0 0 1-6.1 6.1l-8 8a2.1 2.1 0 0 1-3-3l8-8a4.7 4.7 0 0 1 6.1-6.1l-3 3 .3 2.7 2.7.3z',
  plant:  'M12 21v-9M12 12c0-3.4 2.3-6.4 6-7.2.6 3.9-1.6 7.2-6 7.2zM12 14.4c-3.5 0-5.6-2.6-5.1-6 3.2.7 5.1 3.1 5.1 6zM7.6 21h8.8',
  wave:   'M2.4 9.4c2.4-2.6 4.8-2.6 7.2 0s4.8 2.6 7.2 0 3.6-2 4.8-1M2.4 15.4c2.4-2.6 4.8-2.6 7.2 0s4.8 2.6 7.2 0 3.6-2 4.8-1',
  bag:    'M4.4 7.6h15.2l1.1 12.2a1 1 0 0 1-1 1.1H4.3a1 1 0 0 1-1-1.1zM8.4 10V6.6a3.6 3.6 0 0 1 7.2 0V10',
  coin:   'M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8zM12 7.2v9.6M14.6 9.4a2.9 2.9 0 0 0-2.6-1.3c-1.6 0-2.6.9-2.6 2s.9 1.8 2.6 2.1 2.7 1 2.7 2.1-1.1 2-2.7 2a3 3 0 0 1-2.7-1.4',
}

export const GLYPH_KEYS = Object.keys(PATHS) as GlyphKey[]

type Props = { name: GlyphKey; size?: number; className?: string; strokeWidth?: number }

export function Glyph({ name, size = 24, className, strokeWidth = 1.6 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
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
