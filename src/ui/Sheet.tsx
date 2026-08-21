import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './Icons'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  /** Centred dialog instead of a bottom sheet. */
  dialog?: boolean
  /** Hides the close button — for flows the user must answer. */
  required?: boolean
  labelledBy?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet / dialog with the accessibility bits that usually get skipped:
 * focus moves in on open and back on close, Tab is trapped, Escape closes, and
 * the page behind stops scrolling.
 */
export function Sheet({ open, onClose, title, children, footer, dialog, required, labelledBy }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    returnFocusRef.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Focus the first real control, not the panel, so typing just works.
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panelRef.current)?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !required) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return
      const list = [...nodes].filter((n) => n.offsetParent !== null)
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      returnFocusRef.current?.focus({ preventScroll: true })
    }
  }, [open, onClose, required])

  if (!open) return null

  return createPortal(
    <div
      className={`overlay ${dialog ? 'overlay--center' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !required) onClose() }}
    >
      <div
        ref={panelRef}
        className={`sheet ${dialog ? 'sheet--dialog' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : title}
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {!dialog && <div className="sheet__handle" aria-hidden />}
        {(title || !required) && (
          <div className="sheet__head">
            {title ? <h2 className="sheet__title">{title}</h2> : <span />}
            {!required && (
              <button className="btn btn--bare btn--icon" onClick={onClose} aria-label="Close">
                <IconClose />
              </button>
            )}
          </div>
        )}
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
