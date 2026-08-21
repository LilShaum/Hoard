# HOARD — Blueprint

> **Save like it's a game.**
> A gamified savings tracker. You set vaults (goals), log what you put aside,
> and the app turns consistency into levels, streaks, quests and ranks.

---

## 1. Where this came from

The brief, verbatim from the friend who asked for it:

| Their words | What it means for the product |
|---|---|
| "an app for me to save money" | Savings **tracking**, not banking. Money stays in their real account. |
| "Saving money in my acc / General like just saying" | No bank integration, no Plaid, no card. Manual logging is the model. |
| "Make it like a game" | Gamification is the *core loop*, not a badge bolted on the side. |
| "goals I can set to work towards" | Multi-goal ("vault") system with visible progress. |
| "monthly goals" | A recurring, resetting monthly target with its own arc. |
| "maybe a Xmas goal" | Deadline-dated goals with **pace maths** — the killer feature. |

### The one design insight
Every savings app shows you a bar filling up. Almost none tell you the thing you
actually want to know: **"am I going to make it?"** Hoard's spine is *pace* —
required-per-week, projected finish date, on-track / behind / at-risk — and the
game layer exists to make you keep feeding that pace.

### Non-goals
No real bank connections, no payments, no accounts/server, no ads, no
"financial advice". Data is local to the device and exportable. That keeps it
private, free to run, and shippable as a single link.

---

## 2. Product pillars

1. **Visceral progress.** Vaults fill. Numbers roll up. Rings close. A deposit
   should feel like landing a hit.
2. **Honest pacing.** The app never lies about whether you're on track. It shows
   the number you need to hit per week and the date you're actually projected to
   land on.
3. **Forgiving streaks.** Money isn't Duolingo. The headline streak is *weekly*,
   with earned freezes. Missing one week shouldn't nuke a 6-month habit.
4. **Rewards that aren't grind.** No currency to farm, no loot boxes. Levels
   unlock themes and ranks. XP has diminishing returns so a rich week can't
   trivialise the ladder, and a small saver still climbs.
5. **Works in 10 seconds.** Open → tap **+ Save** → amount → done. Everything
   else is optional depth.

---

## 3. Naming & flavour

**Hoard.** You're building a treasure hoard; goals are **vaults**; the rank
ladder is a dragon's progression. Flavour lives in *copy and rank names only* —
the UI itself is a sleek, dark, modern finance app, not a cartoon. Premium look,
game mechanics.

### Rank ladder
| Levels | Rank | Sigil | Unlocks |
|---|---|---|---|
| 1–2 | Wyrmling | 🥚 | — |
| 3–5 | Coin Sprite | ✨ | Theme: Emberlight |
| 6–9 | Hoarder | 🪙 | Theme: Deep Sea |
| 10–14 | Vaultkeeper | 🔐 | Theme: Verdant |
| 15–20 | Gilded | 🏅 | Theme: Royal |
| 21–27 | Treasurer | 💎 | Theme: Ice |
| 28–35 | Drakelord | 🐉 | Theme: Dragonfire |
| 36–44 | Goldwyrm | 👑 | Theme: Aurum |
| 45+ | Elder Wyrm | 🌟 | Theme: Void |

---

## 4. Domain model

All amounts are stored as **integer minor units** (cents/pence). Floats never
touch money.

```ts
type ISODate = string          // 'YYYY-MM-DD', local calendar day
type Cents   = number          // integer

type Vault = {                 // a savings goal
  id: string
  name: string
  emoji: string
  target: Cents | null         // null = open-ended "just accumulate"
  deadline: ISODate | null     // null = no date pressure
  color: AccentKey
  createdAt: ISODate
  completedAt: ISODate | null
  archived: boolean
  note: string
}

type Entry = {                 // a movement of money
  id: string
  vaultId: string | null       // null = general hoard (their "acc")
  amount: Cents                // always positive
  kind: 'deposit' | 'withdrawal'
  date: ISODate
  note: string
  createdAt: number            // epoch ms, for tie-breaks + ordering
}

type Profile = {
  name: string
  currency: string             // ISO 4217, drives Intl.NumberFormat
  locale: string
  monthlyTarget: Cents         // the recurring monthly goal
  xp: number
  theme: ThemeKey
  unlockedThemes: ThemeKey[]
  sound: boolean
  onboarded: boolean
  createdAt: ISODate
}

type Progress = {
  claimedQuests: Record<string, ISODate>   // questId -> claim date
  unlockedAchievements: Record<string, ISODate>
  freezesUsed: string[]        // ISO week keys a freeze was spent on
  seenLevel: number            // for level-up modal dedupe
}

type State = {
  version: number              // schema version, drives migrations
  profile: Profile
  vaults: Vault[]
  entries: Entry[]
  progress: Progress
}
```

**Everything else is derived.** Balances, streaks, levels, quest progress,
achievements, pace and stats are pure functions of `State`. There is no
duplicated/cached progress that can drift out of sync — the single hardest bug
class in an app like this is simply designed out.

---

## 5. The game system

### 5.1 XP
Deposits give XP on a logarithmic curve so the ladder can't be bought:

```
xpForDeposit(cents) = round( 10 + 12 * ln(1 + dollars / 10) )
```

| Deposit | XP |
|---|---|
| $5 | 15 |
| $20 | 23 |
| $50 | 32 |
| $200 | 47 |
| $1,000 | 65 |
| $5,000 | 85 |

Anti-farm rule: only the **first 3 deposits per calendar day** earn XP. Splitting
$60 into twelve $5 drops earns less than logging it once.

Other XP sources:
- Completing a quest: **50–150 XP** by tier (daily / weekly / monthly).
- Finishing a vault: `200 + 40 * ln(1 + target$/100)` (≈ 200–400 XP).
- Each week of streak survived: `25 + 5 * min(streak, 20)` (30 → 125 XP).
- Hitting the monthly target: **300 XP**.
- Unlocking an achievement: its own XP value (25–500).

### 5.2 Levels
Cumulative XP to reach level *n*: `50 * (n-1)^1.75`, rounded to the nearest 10.
Level 2 at 50 XP, level 5 at 570, level 10 at 2,340, level 15 at 5,070, level 28
at 15,990, level 50 at 45,370, capped at level 60. Early levels come fast
(first-session dopamine), later ones are a genuine long game.

### 5.3 Streaks
- Unit is the **ISO week** (Mon–Sun). A week counts if it contains ≥1 deposit.
- The current week is never counted as broken — you always have until Sunday.
- **Freezes:** one is earned every 4 consecutive weeks, banked up to 2, and spent
  automatically on the first missed week. The UI shows freezes as ❄️ and tells
  you when one saved you.
- A separate **active days** counter feeds the heatmap and achievements without
  creating daily pressure.

### 5.4 Quests
Three tiers, all generated **deterministically** from a seeded PRNG keyed by the
period id (`2026-W34`), so they're stable across reloads and can't be rerolled.

- **Daily** (1 active): "Log any deposit today", "Add to a dated vault", "Beat
  yesterday's total".
- **Weekly** (3 active): "Deposit on 3 different days", "Save {dynamic target}
  this week", "Feed 2 different vaults", "Beat last week's total".
- **Monthly** (1 active): the monthly target itself, plus a stretch variant.

Dynamic targets scale off the user's own median week, so quests stay achievable
for someone saving $20/wk and meaningful for someone saving $500/wk.

Quest progress is computed from entries; **claiming** is the only stored state.

### 5.5 Achievements
~30 badges across five families, each a pure predicate over `State`:

| Family | Examples |
|---|---|
| First steps | First deposit, first vault, first vault completed |
| Volume (tiered) | $100 / $500 / $1k / $5k / $10k / $25k total saved |
| Consistency | 4 / 12 / 26 / 52 week streak; 100 active days |
| Discipline | A month with zero withdrawals; 3 vaults finished; beat target 3 months running |
| Story | Comeback (return after 3+ idle weeks), Christmas delivered (dated vault completed on time), Overachiever (150% of a monthly target) |

Hidden achievements exist and reveal on unlock.

---

## 6. Pace engine — the differentiator

For any vault with a `target` and `deadline`:

```
remaining      = target - saved
daysLeft       = max(0, deadline - today)
requiredPerDay = remaining / daysLeft
requiredPerWeek= requiredPerDay * 7
```

Projection uses the user's **recent velocity** — an exponentially weighted mean
of the last 8 weeks of deposits into that vault (falling back to overall
velocity for a young vault, and to a neutral state for a brand-new one):

```
projectedFinish = today + remaining / velocityPerDay
```

Status bands:

| Status | Condition | Tone |
|---|---|---|
| 🏆 **Done** | saved ≥ target | celebrate |
| 🚀 **Ahead** | projected ≥ 5 days before deadline | green |
| ✅ **On track** | projected within ±5 days | green |
| ⚠️ **Behind** | projected 1–21 days late | amber, shows the new per-week number |
| 🔥 **At risk** | projected >21 days late, or required/wk > 2× velocity | red, shows the gap |
| 💤 **No data** | fewer than 2 weeks of history | neutral |

Vault detail also carries a **what-if simulator**: a slider for "if I add $X per
week…" that live-updates the projected date and the on-time verdict. This is
what turns "I want a Christmas goal" into "add $34 a week and you land Dec 12,
13 days early."

---

## 7. Screens

### 7.1 Onboarding (first run)
Four steps, skippable: name → currency → first vault (presets: 🎄 Christmas,
✈️ Trip, 🛟 Emergency fund, 📱 New phone, 🚗 Car, 🎫 Concert, ✏️ Custom) →
monthly target (with sensible suggestions). Ends on a "your hoard begins" beat.

### 7.2 Home
- **Crest**: level ring + XP to next level, rank name, streak flame + freezes.
- **Total hoard**: animated roll-up number, all-time and this-month deltas.
- **Monthly ring**: progress to the monthly target with days left in the month.
- **+ Save**: the primary action, thumb-reachable, always visible.
- **Vault rail**: horizontally scrollable vault cards with fill + pace badge.
- **Quests strip**: today's quests with claimable rewards.
- **Recent activity**: last few entries, swipe-to-undo.

### 7.3 Vaults
Grid of vault cards; create/edit sheet; detail view with contribution history,
a projection chart, the what-if slider, and complete/archive actions.

### 7.4 Quests
Daily / weekly / monthly quests with progress bars and claim buttons, plus the
monthly target editor and a monthly recap card.

### 7.5 Progress
- Rank ladder with the next unlock previewed.
- **Cumulative savings** area chart.
- **Monthly bars** vs target.
- **Contribution heatmap** (GitHub-style, 26 weeks).
- **Vault split** donut.
- Personal records: best week, best month, longest streak, biggest single save.
- Achievements grid, locked/unlocked, with tier rings.

### 7.6 Profile
Name, currency, monthly target, theme picker (locked themes shown with their
unlock level), sound toggle, JSON export/import, load demo data, reset.

---

## 8. Feedback & feel

- **Number roll-ups** on every money figure (rAF-driven, eased).
- **Confetti** on vault completion and level-up, canvas-based, no library.
- **Level-up modal** with the new rank and anything it unlocked.
- **WebAudio blips** synthesised at runtime — no audio assets. Coin *ping* on
  deposit, arpeggio on level-up. Toggleable.
- **Haptics** via `navigator.vibrate` where supported.
- `prefers-reduced-motion` disables confetti, roll-ups and transitions.

---

## 9. Architecture

```
src/
  domain/          pure, dependency-free, 100% unit-tested
    money.ts       cents maths + Intl formatting
    dates.ts       ISO weeks, month keys, local-safe date maths
    xp.ts          XP curve, level curve, rank ladder
    streak.ts      weekly streak + freeze resolution
    pace.ts        velocity, projection, status bands
    quests.ts      seeded generation + progress evaluation
    achievements.ts predicates + tiers
    stats.ts       aggregations for every chart
    selectors.ts   derived state composed from the above
  store/           useSyncExternalStore store, actions, localStorage + migrations
  ui/              design-system primitives (Ring, Bar, Sheet, Card, Button…)
  charts/          hand-rolled SVG charts, zero dependencies
  screens/         Home, Vaults, Quests, Progress, Profile, Onboarding
  app/             shell, tab bar, routing, modals, effects
```

**Stack:** React 18 + TypeScript (strict) + Vite. **Zero runtime dependencies**
beyond React — charts, confetti, sound, state and routing are all hand-built.
Styling is CSS custom properties with a token layer, which is what makes the
9-theme system a one-line swap.

**State:** one immutable `State` object, a reducer of explicit actions, and
`useSyncExternalStore` for subscriptions. Persistence is versioned with a
migration chain, so future schema changes never eat someone's data.

**Testing:** Vitest over the domain layer — the XP curve, streak/freeze
resolution, pace bands, quest generation determinism, achievement predicates and
money maths.

**Delivery:** the normal Vite build for the repo, plus a single-file build
(`vite-plugin-singlefile`) that inlines everything into one HTML document, so
the whole app is a link that works offline on a phone.

---

## 10. Build plan

| Phase | Deliverable |
|---|---|
| **0** | This blueprint. |
| **1** | Scaffold, design tokens, theme system, store + persistence + migrations. |
| **2** | Domain engine (money, dates, xp, streak, pace, quests, achievements, stats) + unit tests. |
| **3** | UI primitives, app shell, tab navigation, Save sheet. |
| **4** | Home, Vaults (list, detail, editor, what-if simulator). |
| **5** | Quests, monthly target, achievements. |
| **6** | Progress screen + all charts. |
| **7** | Onboarding, Profile, themes, export/import, demo data. |
| **8** | Feel pass: confetti, level-up, sound, haptics, reduced-motion, a11y, mobile. |
| **9** | Full test suite green, typecheck clean, single-file build, publish, document, push. |

---

## 11. Definition of done

- `npm test` and `tsc` both clean.
- Every screen works on a 360px-wide phone and on desktop.
- Keyboard-navigable; focus states everywhere; sheets trap focus and close on Esc.
- Data survives reload, migrates across versions, and exports/imports losslessly.
- The app is one shareable link, works offline, and stores nothing on a server.
