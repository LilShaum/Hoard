import { IconChart, IconHome, IconQuest, IconUser, IconVault } from '@/ui/Icons'
import { TABS, type Tab } from './router'

const META: Record<Tab, { label: string; Icon: (p: { size?: number }) => JSX.Element }> = {
  home: { label: 'Home', Icon: IconHome },
  vaults: { label: 'Vaults', Icon: IconVault },
  quests: { label: 'Goals', Icon: IconQuest },
  progress: { label: 'Progress', Icon: IconChart },
  profile: { label: 'You', Icon: IconUser },
}

type Props = {
  active: Tab
  onSelect: (tab: Tab) => void
  /** Count of claimable quests, shown as a dot on the Quests tab. */
  questBadge: number
}

export function TabBar({ active, onSelect, questBadge }: Props) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const { label, Icon } = META[tab]
        const current = active === tab
        return (
          <button
            key={tab}
            className="tabbar__btn"
            aria-current={current ? 'page' : undefined}
            onClick={() => onSelect(tab)}
          >
            <span className="tabbar__icon">
              <Icon size={22} />
              {tab === 'quests' && questBadge > 0 && (
                <span className="tabbar__dot" aria-hidden>{questBadge}</span>
              )}
            </span>
            <span className="tabbar__label">{label}</span>
            {tab === 'quests' && questBadge > 0 && (
              <span className="sr-only">{questBadge} quests ready to claim</span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
