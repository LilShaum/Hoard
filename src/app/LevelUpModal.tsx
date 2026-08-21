import { Sheet } from '@/ui/Sheet'
import { Creature, stageForLevel, stageName } from '@/ui/Creature'
import type { LevelUp } from './effects'
import { THEME_LABEL } from './themes'
import type { ThemeKey } from '@/domain/types'

/**
 * The level-up moment, as a status window rather than a particle effect. It
 * states what actually changed — level, rank, form, unlock — because that is
 * the information the player wanted, and confetti was never carrying any of it.
 */
export function LevelUpModal({ info, onClose }: { info: LevelUp | null; onClose: () => void }) {
  const stage = info ? stageForLevel(info.level) : 0

  return (
    <Sheet open={info != null} onClose={onClose} dialog title="Level up">
      {info && (
        <div className="levelup">
          <div className="levelup__art" style={{ color: 'var(--accent)' }}>
            <Creature stage={stage} size={96} />
          </div>

          <dl className="levelup__stats">
            <div>
              <dt className="label">Level</dt>
              <dd className="num">
                <span className="faint">{info.fromLevel}</span>
                <span className="levelup__arrow" aria-label="rises to">→</span>
                <strong>{info.level}</strong>
              </dd>
            </div>
            <div>
              <dt className="label">Rank</dt>
              <dd>
                {info.rankName}
                {info.rankChanged && <span className="levelup__new">new</span>}
              </dd>
            </div>
            <div>
              <dt className="label">Form</dt>
              <dd>
                {stageName(stage)}
                {info.evolved && <span className="levelup__new">evolved</span>}
              </dd>
            </div>
            {info.unlockedTheme && (
              <div>
                <dt className="label">Unlocked</dt>
                <dd>
                  {THEME_LABEL[info.unlockedTheme as ThemeKey] ?? info.unlockedTheme} theme
                  <span className="levelup__new">new</span>
                </dd>
              </div>
            )}
          </dl>

          <button className="btn btn--primary btn--block" onClick={onClose}>Keep going</button>
        </div>
      )}
    </Sheet>
  )
}
