type Props = { size?: number; className?: string; strokeWidth?: number }

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export const IconHome = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-3.5v-6h-7v6H5A1.5 1.5 0 0 1 3.5 19z" />
  </svg>
)

export const IconVault = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 8.4V6.6M12 17.4v-1.8M15.6 12h1.8M6.6 12h1.8" />
  </svg>
)

export const IconQuest = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M6 3h10.5A2.5 2.5 0 0 1 19 5.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 1-1.73" />
    <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
  </svg>
)

export const IconChart = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
)

export const IconUser = ({ size = 22, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </svg>
)

export const IconPlus = ({ size = 22, strokeWidth = 2.2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M12 5v14M5 12h14" /></svg>
)

export const IconMinus = ({ size = 22, strokeWidth = 2.2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M5 12h14" /></svg>
)

export const IconClose = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M6 6l12 12M18 6L6 18" /></svg>
)

export const IconCheck = ({ size = 20, strokeWidth = 2.4, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M4.5 12.5l5 5 10-11" /></svg>
)

export const IconChevron = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M9 5l7 7-7 7" /></svg>
)

export const IconBack = ({ size = 20, strokeWidth = 2, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}><path d="M15 5l-7 7 7 7" /></svg>
)

export const IconEdit = ({ size = 18, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
  </svg>
)

export const IconTrash = ({ size = 18, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.8 12.2A1.8 1.8 0 0 0 9 21h6a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
  </svg>
)

export const IconFlame = ({ size = 18, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12.8 2.2c.4 3 .3 4.4-1.4 6.2-1.4 1.5-2 2.6-2 4a3.5 3.5 0 0 0 1.4 2.8c-.2-1.7.5-3 1.8-4 0 1.5.5 2.3 1.7 3.4 1.1 1 1.6 2 1.6 3.2 0 2.3-2 4.2-4.6 4.2-3.1 0-5.6-2.4-5.6-5.7 0-2 .7-3.6 2.4-5.7C10.2 7.2 12 5.3 12.8 2.2z" />
  </svg>
)

export const IconSnow = ({ size = 16, strokeWidth = 1.6, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10" />
  </svg>
)

export const IconSpark = ({ size = 18, className }: Props) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
    <path d="M18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" opacity=".65" />
  </svg>
)

export const IconLock = ({ size = 16, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
)

export const IconTarget = ({ size = 18, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" />
  </svg>
)

export const IconCalendar = ({ size = 16, strokeWidth = 1.8, className }: Props) => (
  <svg {...base(size, strokeWidth)} className={className}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3.5V6M16 3.5V6" />
  </svg>
)
