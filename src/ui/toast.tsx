import { useSyncExternalStore } from 'react'

export type Toast = { id: number; icon: string; text: string; xp?: number }

let items: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => { for (const l of listeners) l() }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const snapshot = () => items

const TTL = 2800
const MAX = 3

export function toast(text: string, icon = '✨', xp?: number): void {
  const t: Toast = { id: nextId++, icon, text, xp }
  items = [...items, t].slice(-MAX)
  emit()
  setTimeout(() => {
    items = items.filter((x) => x.id !== t.id)
    emit()
  }, TTL)
}

export function ToastHost() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot)
  if (list.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div className="toast" key={t.id}>
          <span className="toast__icon" aria-hidden>{t.icon}</span>
          <span className="grow">{t.text}</span>
          {t.xp != null && <span className="toast__xp">+{t.xp} XP</span>}
        </div>
      ))}
    </div>
  )
}
