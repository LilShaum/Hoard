<div align="center">

# 🐉 Hoard

**A savings app that plays like a game.**

[**▶ Open the live app**](https://claude.ai/code/artifact/945561bd-8708-4382-80ce-c8e16f8f7011)

Set vaults, log what you put aside, and watch consistency turn into levels,
streaks, quests and ranks. No bank connection, no account, no ads — the money
stays in your own account, Hoard just makes keeping it there feel like winning.

</div>

---

## Where this came from

A friend asked for it, roughly like this:

> *"Can you make an app for me to save money"* · *"Saving money in my acc, general like just saying"*
> *"Make it like a game"* · *"With goals I can set to work towards"*
> *"have like monthly goals and like ways I can set maybe a Xmas goal"*

So: a savings **tracker**, not a bank. Gamification as the core loop, not a
badge bolted on the side. Multiple goals, a recurring monthly target, and
date-driven goals with real pace maths behind them.

## The one idea

Every savings app draws a bar filling up. Almost none answer the question you
actually have: **am I going to make it?**

Hoard's spine is *pace*. Give a vault a target and a date and it tells you the
number you need per week, projects the date you'll actually land on from your
own recent rate, and grades it honestly — ahead, on track, behind, at risk. The
what-if slider closes the loop: *"add $34 a week and you finish 12 December,
13 days early."*

The game layer exists to make you keep feeding that number.

## What's in it

| | |
|---|---|
| **Vaults** | Named goals with a target, an optional deadline, an emoji and a colour. Presets for Christmas 🎄, a trip ✈️, an emergency fund 🛟 and more. |
| **Pace engine** | Required-per-week, an EWMA projection of your real finish date, six status bands, and a live what-if simulator. |
| **Levels & ranks** | 60 levels across nine dragon ranks, Wyrmling → Elder Wyrm. XP is logarithmic in money, so the ladder can't be bought and a small saver still climbs. |
| **Streaks** | Weekly, not daily — money isn't Duolingo. The current week can never break a streak, and freezes are earned every four weeks to cover a bad one. |
| **Quests** | Daily, weekly and monthly, generated deterministically so refreshing can't reroll them, with targets that scale to what *you* actually save. |
| **Achievements** | ~30 badges in bronze/silver/gold tiers, including hidden ones that reveal on unlock. |
| **Monthly target** | One number to aim at, with a pace marker showing where an even month would have put you. |
| **Progress** | Cumulative area chart, monthly bars against target, a 26-week contribution heatmap, a vault-split donut, and personal records. |
| **Themes** | Nine palettes, one unlocked per rank. |
| **Feel** | Confetti, level-up modal, roll-up counters, haptics, and coin pings synthesised in WebAudio — no audio assets. |
| **Your data** | Everything is local. JSON export/import, demo data, and a full erase. |

## Running it

```bash
npm install
npm run dev          # dev server
npm run verify       # typecheck + unit tests + build
npm run build        # normal production build  -> dist/
npm run build:single # one self-contained .html -> dist-single/
npm run build:artifact # the same page as a body fragment, for embedding
```

The single-file build inlines everything — scripts, styles and both typefaces —
into one HTML document with no external requests at all, so it works offline and
behind any content-security policy.

End-to-end tests drive the built app in a real browser:

```bash
npm run build && npx vite preview --port 4173 &
npm run test:e2e     # 23 browser assertions
npm run shots        # screenshots of every screen -> shots/
```

## How it's built

**React 18 + TypeScript (strict) + Vite, with zero runtime dependencies beyond
React.** The charts, confetti, sound, state store and router are all hand-built
— partly for bundle size, mostly because each is ~60 lines and a dependency
would have been the larger commitment.

```
src/
  domain/     pure, dependency-free, fully unit-tested
    dates     local-calendar maths and ISO weeks
    money     integer cents; the parser splits strings, never multiplies floats
    xp        the XP curve, the level curve, the rank ladder
    streak    weekly streaks and freeze resolution
    pace      velocity, projection, status bands, the what-if simulator
    quests    seeded generation and progress evaluation
    achievements  ~30 predicates
    stats     aggregations for every chart
    selectors one function turning State into everything the UI needs
  store/      useSyncExternalStore store, reducer, persistence, migrations
  ui/         design-system primitives
  charts/     hand-rolled SVG
  screens/    Onboarding, Home, Vaults, Quests, Progress, Profile
  app/        shell, routing, effects
```

### Three decisions worth knowing about

**Everything is derived.** XP, levels, streaks, vault completion, quest progress
and achievement state are all pure functions of the stored entries. Nothing
about your progress is written down separately, so the entire class of "my level
says 12 but the bar says 9" bugs is designed out rather than tested for. Import a
backup and it lands at exactly the right level for free.

**Money is integer cents, and the parser never multiplies a float.** `1.005 * 100`
is `100.4999…` in binary, so the obvious implementation quietly charges you a
cent. Hoard splits the string instead. There's a test for it.

**The theme attribute is namespaced.** Themes key off `data-hoard-theme`, not
`data-theme`, because an embedding host may stamp its own light/dark preference
on the same root element — and two systems writing one attribute is a fight
nobody wins. The default palette also lives on bare `:root`, so the very first
paint is already themed rather than borrowing whatever ground the host paints.

**Storage is treated as hostile.** Everything read back from `localStorage` — or
from a file you import — is checked, coerced or dropped field by field, and
entries are deduplicated by id so importing the same backup twice can't double
your balance. A corrupt blob costs you a field, never the app.

## Testing

| Suite | What it covers |
|---|---|
| **212 unit tests** (Vitest) | The XP and level curves, ISO-week edge cases (2021-01-01 is 2020-W53), freeze resolution, every pace band, quest determinism, badge predicates, money parsing, and the persistence sanitiser. |
| **23 end-to-end assertions** (Playwright) | Onboarding, saving, pace, the what-if slider, persistence across reloads, quest claiming, theme unlocks, destructive flows, focus management, keyboard shortcuts, the sandboxed-embed backup path, and every screen rendering without a broken value. The same suite is run against the embedded build inside a simulated host, so the published page is tested as it is actually served. |

## Privacy

There is no server. Nothing leaves the device, there's no account to create, and
no analytics. That also means clearing your browser data clears your hoard — so
the Profile screen has a one-tap JSON backup.

---

<div align="center">
<sub>Built for a friend who wanted saving money to feel like a game.</sub>
</div>
