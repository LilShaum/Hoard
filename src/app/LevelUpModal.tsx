import { Sheet } from '@/ui/Sheet'
import { Ring } from '@/ui/Ring'
import type { LevelUp } from './effects'
import { THEME_LABEL } from './themes'

export function LevelUpModal({ info, onClose }: { info: LevelUp | null; onClose: () => void }) {
  return (
    <Sheet open={info != null} onClose={onClose} dialog title="">
      {info && (
        <div className="levelup">
          <Ring value={1} size={128} stroke={9}>
            <span className="levelup__sigil" aria-hidden>{info.sigil}</span>
          </Ring>
          <p className="levelup__eyebrow">Level up</p>
          <h2 className="levelup__level">Level {info.level}</h2>
          <p className="levelup__rank">{info.rankName}</p>
          {info.unlockedTheme && (
            <p className="badge badge--accent levelup__unlock">
              🎨 New theme unlocked — {THEME_LABEL[info.unlockedTheme] ?? info.unlockedTheme}
            </p>
          )}
          <button className="btn btn--primary btn--block" onClick={onClose}>Keep going</button>
        </div>
      )}
    </Sheet>
  )
}
