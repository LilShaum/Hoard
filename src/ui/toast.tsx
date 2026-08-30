import { useSyncExternalStore } from 'react'

export type ToastAction = { label: string; run: () => void }
export type Toast = { id: number; text: string; xp?: number; action?: ToastAction }

let items: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => { for (const l of listeners) l() }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const snapshot = () => items

const TTL = 2800
/* An offer you have to read, understand and reach for needs longer than an
   acknowledgement you only have to notice. */
const TTL_ACTION = 7000
const MAX = 3

const dismiss = (id: number) => {
  items = items.filter((x) => x.id !== id)
  emit()
}

export function toast(text: string, xp?: number, action?: ToastAction): void {
  const t: Toast = { id: nextId++, text, xp, action }
  items = [...items, t].slice(-MAX)
  emit()
  setTimeout(() => dismiss(t.id), action ? TTL_ACTION : TTL)
}

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot)
  if (list.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div className="toast" key={t.id}>
          <span className="grow">{t.text}</span>
          {t.xp != null && <span className="toast__xp">+{t.xp} XP</span>}
          {t.action && (
            <button
              className="toast__action"
              onClick={() => { t.action?.run(); dismiss(t.id) }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
