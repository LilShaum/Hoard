/**
 * The interface icon set.
 *
 * The first version of this file was a Feather clone: rounded rectangles with
 * `rx="3"`, round caps, a circle-and-shoulders person, a rounded-corner
 * calendar. Every app ships those, which is exactly the problem — they were
 * the one part of the interface that could have come from anywhere, sitting
 * inside a design system whose first rule is "hard geometry. Nothing in this
 * interface is a pill."
 *
 * So the construction here is:
 *
 *  - **Corners are corners.** No `rx`, no round caps, mitred joins. The only
 *    curve in the set is the one place a curve is load-bearing.
 *  - **Two marks are the app's own, not generic.** Progress is the notched bar
 *    the whole interface measures things with, drawn as discrete cells; You is
 *    a rank plate, because rank is what that screen is about. Neither is a
 *    shape you have seen in another app's tab bar.
 *  - **Fill is used where a line would be noise.** At 22px a four-cell notched
 *    column reads as solid blocks or it reads as mush; it does not read as
 *    four outlined rectangles.
 *  - **One weight across the set**, so a row of them looks like one hand.
 *
 * All on a 24 grid, `currentColor`, so they take the type colour beside them.
 */

type Props = { size?: number; className?: string; strokeWidth?: number }

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  // Butt and mitre, not round — the whole point of the set.
  strokeLinecap: 'butt' as const,
  strokeLinejoin: 'miter' as const,
  strokeMiterlimit: 6,
  'aria-hidden': true,
})

/** A keep, not a cottage: steep roof, square walls, a doorway cut straight in. */
export const IconHome = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M2.4 11.2 12 3.2l9.6 8" />
    <path d="M4.8 9.2V20.8h14.4V9.2" />
    <path d="M9.6 20.8v-6.2h4.8v6.2" />
  </svg>
)

/**
 * A strongbox: the case, the door inside it, and a spoked wheel on the door.
 * A plain cross through the inner square read as a window pane.
 */
export const IconVault = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.2 4.4h17.6v15.2H3.2z" />
    <path d="M6.8 8h10.4v8H6.8z" />
    <path d="M12 8.2v2.2M12 13.6v2.2M7 12h2.2M14.8 12h2.2" />
    <path d="M10.6 10.6h2.8v2.8h-2.8z" fill="currentColor" stroke="none" />
  </svg>
)

/** A pennant planted on a pole — a goal claimed, not a page of notes. */
export const IconQuest = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 2.8v18.4" />
    <path d="M6 4.4h12.6L15.6 8.6l3 4.2H6z" />
  </svg>
)

/**
 * The notched bar the rest of the app measures with, stood on end three times.
 * Filled, because four outlined cells at 22px is grey haze.
 */
export const IconChart = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className} fill="currentColor" stroke="none">
    <path d="M3.4 16.4h4.2v3.4H3.4zM3.4 12.2h4.2v3.4H3.4z" />
    <path d="M9.9 16.4h4.2v3.4H9.9zM9.9 12.2h4.2v3.4H9.9zM9.9 8h4.2v3.4H9.9z" />
    <path d="M16.4 16.4h4.2v3.4h-4.2zM16.4 12.2h4.2v3.4h-4.2zM16.4 8h4.2v3.4h-4.2zM16.4 3.8h4.2v3.4h-4.2z" />
  </svg>
)

/** A rank plate with its chevron. That screen is about rank, so say so. */
export const IconUser = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 2.6l8.2 4.6v9.6L12 21.4 3.8 16.8V7.2z" />
    <path d="M7.8 14.2 12 9.6l4.2 4.6" />
  </svg>
)

export const IconPlus = ({ size = 22, strokeWidth = 2.2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M12 4.2v15.6M4.2 12h15.6" /></svg>
)

export const IconMinus = ({ size = 22, strokeWidth = 2.2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M4.2 12h15.6" /></svg>
)

export const IconClose = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M5.2 5.2 18.8 18.8M18.8 5.2 5.2 18.8" /></svg>
)

export const IconCheck = ({ size = 20, strokeWidth = 2.4, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M3.8 12.4 9.4 18 20.2 5.6" /></svg>
)

export const IconChevron = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M8.8 4.2 16.6 12l-7.8 7.8" /></svg>
)

export const IconBack = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M15.2 4.2 7.4 12l7.8 7.8" /></svg>
)

/** A squared nib and a straight shaft — a drafting pencil, not a crayon. */
export const IconEdit = ({ size = 18, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.4 20.6v-4.5L15.7 3.8l4.5 4.5L7.9 20.6z" />
    <path d="M13.5 6 18 10.5" />
  </svg>
)

/** Straight-sided, slightly tapered — a bin, not a bucket. */
export const IconTrash = ({ size = 18, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.4 6.4h17.2" />
    <path d="M9.2 6.4V3.6h5.6v2.8" />
    <path d="M5.6 6.4 6.9 20.8h10.2L18.4 6.4" />
    <path d="M10.2 10.2v6.8M13.8 10.2v6.8" />
  </svg>
)

/**
 * A squared shackle, narrower than the body. Drawn as a peak it read as a
 * little house sitting on a box.
 */
export const IconLock = ({ size = 16, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4.4 10.4h15.2v10.2H4.4z" />
    <path d="M8.2 10.4V4.6h7.6v5.8" />
  </svg>
)

/** Square pegs, a ruled header, and one date struck. */
export const IconCalendar = ({ size = 16, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.4 5.2h17.2v15.4H3.4z" />
    <path d="M3.4 9.8h17.2M8 2.8v4.4M16 2.8v4.4" />
    <path d="M6.4 12.6h3.2v3.2H6.4z" fill="currentColor" stroke="none" />
  </svg>
)
