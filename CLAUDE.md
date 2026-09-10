# Working on Hoard

A savings app that plays like a game, built for a friend who wanted saving to
feel like something. Read `.claude/skills/app-making/SKILL.md` before doing any
UI work here — it was written from this project's own mistakes.

## How to work with me (the person you are talking to)

I steer in short messages, often just "go". That means *proceed*, not *explain
the plan*. Get on with it and report what happened.

**Do not re-argue a decision I have closed.** If I say "do X if it's easier"
and you find it is not easier, say so once, briefly, and move on. Restating the
case in your next summary is the thing that annoys me most.

**Be blunt back.** If something I asked for is a bad idea, say it in a sentence
and then do the best available version anyway, or tell me what you'd do
instead. Don't hedge across three paragraphs.

**Length: match the work.** A one-line fix gets a one-line report. Don't write
an essay about a CSS change. Do write properly when you found something
structural or got something wrong.

**Tell me plainly when you got it wrong.** Once, without grovelling, and with
what you changed. Do not bury it in a summary of successes.

## What you cannot see, and must not pretend to

You run headless Chromium in a Linux container. You have never seen this app on
a phone. Neither has your test suite.

So when you finish anything visual or interactive, say what you actually
verified and on what. "Verified in Chromium; iOS Safari unchecked" is the
honest sentence and I would rather have it than a confident one.

Things that have already shipped broken here because they *looked* finished:

- an Undo button that rendered perfectly and was completely inert
  (`pointer-events: none` on the layer above it)
- a calendar download that may never have reached iOS at all
- the README claiming two different, both wrong, test counts

The rule that follows: **click the thing.** Assert that it *worked*, not that
it rendered. And after writing a regression test, break the fix and confirm the
test fails — a test that passes either way is worse than no test.

## Before you say a screen is done

Screenshot it and look at the image. Not the source — the image.

Do it for **two accounts**: a populated one, and a brand new one. The new-account
pass finds more. It is where the Progress tab was found returning a single
"Nothing to chart yet" card *in place of the whole screen*, and where a new user
was being told they were "behind an even pace" before they had done anything.

`scripts/e2e.mjs` and the screenshot harness in the app-making skill are the
tools for this. The app shell scrolls an inner container, so Playwright's
`fullPage` only captures one viewport — unlock `.app` and `.app__scroll` height
first if you want the whole screen.

## Design rules that are already settled

Do not relitigate these; they were decided with reasons.

- **The look is a field guide crossed with a handheld RPG status screen.**
  Bordered panels with a label tab, notched stat bars, figures in monospace.
  This is deliberate, written down in `src/styles/app.css`. Refine within it.
- **No colour that is not from the palette.** No `#0ca30c` success green, no
  traffic-light red. Status colours are botanical and defined in `tokens.css`.
- **A saturated hue is identity, not fill.** Full strength on a chip or a glyph;
  pulled toward `--hue-damp` for anything covering real area.
- **Never mix a colour toward a token whose role flips between themes.**
  `--ink-2` is dark on light and light on dark, so mixing toward it damps in one
  theme and brightens in the other. Screenshot both themes after any colour work.
- **No gradients, emoji, confetti, blurred shadows.** Structure does that work.
- **Illustration follows the icon set's construction rules.** Same stroke logic,
  same treatment of fill. Measure path geometry rather than eyeballing it —
  `scripts/artgeom.mjs` reports floating endpoints and kinks.
- **Home summarises; it does not restate the other tabs.** It rendered the full
  `VaultCard` and `QuestRow` three and two times over, which is what made it
  feel cluttered. Compact lines on Home, full cards on their own tab.
- **No implementation detail in user-facing copy.** If it explains how the app
  works internally, rewrite it as what the control does for the reader.

## Architecture that is settled

- **No server, no account, nothing leaves the device.** Considered and kept.
  Push notifications were declined for this reason; the weekly reminder is a
  calendar file the phone delivers. GitHub Pages is static and could not host a
  backend anyway.
- **Money is integer cents**, and every total is derived from entries. Never
  store a running balance.
- **Linked records travel together.** Both halves of a Bank transfer share a
  `transferId`; deleting one alone invents money. This was a real bug.
- **Anything destructive is undoable.** Capture what was removed *before*
  removing it.
- **Additive state fields ride on the sanitiser's default** rather than a schema
  bump. `SCHEMA_VERSION` stays at 2 unless a field changes shape.

## Verifying and shipping

- `npm test` — unit suite
- `npm run typecheck`
- Browser suite: build with `PAGES_BASE=/Hoard/`, preview with the **same** base
  bound to `--host 127.0.0.1` (on a runner `localhost` resolves to `::1` first
  and everything dies on a confusing connection refused), then
  `BASE=... node scripts/e2e.mjs`
- CI gates the deploy on the browser suite against the built sub-path site.
- Commit to `claude/hoard-gc3crq`, and to `main` when the work is finished —
  `main` deploys.

Do not put test counts, or any number that will drift, into the README. It has
already been wrong three times.
