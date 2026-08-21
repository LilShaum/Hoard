import { useCallback, useEffect, useState } from 'react'

export type Tab = 'home' | 'vaults' | 'quests' | 'progress' | 'profile'
export const TABS: Tab[] = ['home', 'vaults', 'quests', 'progress', 'profile']

export type Route =
  | { name: Tab; vaultId?: undefined }
  | { name: 'vault'; vaultId: string }

/**
 * Hash routing in 30 lines. It costs nothing, and it buys the phone's back
 * button working the way people expect inside a vault detail view.
 */
function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [head, id] = parts
  if (head === 'vaults' && id) return { name: 'vault', vaultId: decodeURIComponent(id) }
  if (TABS.includes(head as Tab)) return { name: head as Tab }
  return { name: 'home' }
}

export function toPath(route: Route): string {
  return route.name === 'vault' ? `#/vaults/${encodeURIComponent(route.vaultId)}` : `#/${route.name}`
}

export function useRoute(): [Route, (r: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() =>
    parse(typeof location !== 'undefined' ? location.hash : ''))

  useEffect(() => {
    const onHash = () => setRoute(parse(location.hash))
    window.addEventListener('hashchange', onHash)
    if (!location.hash) history.replaceState(null, '', '#/home')
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = useCallback((r: Route, replace = false) => {
    const path = toPath(r)
    if (replace) history.replaceState(null, '', path)
    else if (location.hash !== path) location.hash = path
    setRoute(r)
  }, [])

  return [route, navigate]
}

/** The tab that should look active — a vault detail still belongs to Vaults. */
export function activeTab(route: Route): Tab {
  return route.name === 'vault' ? 'vaults' : route.name
}
