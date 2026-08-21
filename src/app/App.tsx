import { useCallback, useEffect, useState } from 'react'
import { flush, useHoard, useRawState } from '@/store/store'
import { activeTab, useRoute, type Route, type Tab } from './router'
import { TabBar } from './TabBar'
import { SaveSheet } from './SaveSheet'
import { LevelUpModal } from './LevelUpModal'
import { useGameEffects, useMidnightRefresh, usePersistOnHide, useThemeEffect, type LevelUp } from './effects'
import { Home } from '@/screens/Home'
import { Vaults } from '@/screens/Vaults'
import { Activity } from '@/screens/Activity'
import { VaultDetail } from '@/screens/VaultDetail'
import { Quests } from '@/screens/Quests'
import { Progress } from '@/screens/Progress'
import { Profile } from '@/screens/Profile'
import { Onboarding } from '@/screens/Onboarding'
import { ToastHost } from '@/ui/toast'
import { setSoundEnabled } from '@/ui/feedback'
import { IconPlus } from '@/ui/Icons'

const TITLES: Record<Tab, { title: string; sub?: string }> = {
  home: { title: 'Hoard' },
  vaults: { title: 'Vaults', sub: 'The things you are saving for' },
  quests: { title: 'Quests', sub: 'Targets worth XP' },
  progress: { title: 'Progress', sub: 'Rank, records and badges' },
  profile: { title: 'You', sub: 'Settings and your data' },
}

export function App() {
  const d = useHoard()
  const { profile } = useRawState()
  const [route, navigate] = useRoute()
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveVault, setSaveVault] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null)
  const [, forceRender] = useState(0)

  useThemeEffect(profile.theme, profile.reduceMotion)
  useGameEffects(d, setLevelUp)
  usePersistOnHide(flush)
  useMidnightRefresh(useCallback(() => forceRender((n) => n + 1), []))

  useEffect(() => { setSoundEnabled(profile.sound) }, [profile.sound])

  const openSave = useCallback((vaultId: string | null = null) => {
    setSaveVault(vaultId ?? null)
    setSaveOpen(true)
  }, [])

  // A keyboard shortcut, because this thing is genuinely usable on a laptop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n' || e.key === '+') {
        e.preventDefault()
        openSave(route.name === 'vault' ? route.vaultId : null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSave, route])

  // Scroll to the top when the route changes — a phone habit people expect.
  const scrollRef = useCallback((node: HTMLDivElement | null) => { node?.scrollTo({ top: 0 }) }, [])

  const tab = activeTab(route)
  const meta = TITLES[tab]
  const claimable = d.quests.filter((q) => q.claimable).length

  if (!profile.onboarded) {
    return (
      <div className="app">
        <ToastHost />
        <Onboarding onDone={() => navigate({ name: 'home' }, true)} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app__scroll" key={route.name + (route.vaultId ?? '')} ref={scrollRef}>
        {route.name !== 'vault' && route.name !== 'activity' && (
          <header className="topbar">
            <div className="grow">
              <h1 className="topbar__title">{meta.title}</h1>
              {meta.sub && <p className="topbar__sub">{meta.sub}</p>}
            </div>
            {tab !== 'home' && (
              <button className="btn btn--primary btn--icon" onClick={() => openSave(null)} aria-label="Add to the hoard">
                <IconPlus size={20} />
              </button>
            )}
          </header>
        )}

        <main>
          {route.name === 'home' && <Home onSave={openSave} navigate={navigate} />}
          {route.name === 'vaults' && <Vaults navigate={navigate} />}
          {route.name === 'vault' && (
            <VaultDetail vaultId={route.vaultId} navigate={navigate} onSave={openSave} />
          )}
          {route.name === 'quests' && <Quests />}
          {route.name === 'progress' && <Progress />}
          {route.name === 'profile' && <Profile />}
          {route.name === 'activity' && <Activity navigate={navigate} />}
        </main>
      </div>

      <TabBar
        active={tab}
        questBadge={claimable}
        onSelect={(t: Tab) => navigate({ name: t } as Route)}
      />

      <SaveSheet open={saveOpen} onClose={() => setSaveOpen(false)} vaultId={saveVault} />
      <LevelUpModal info={levelUp} onClose={() => setLevelUp(null)} />
      <ToastHost />
    </div>
  )
}
