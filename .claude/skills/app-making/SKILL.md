---
name: app-making
description: The process for building an app that feels made rather than generated — real visual identity instead of stock component colours, working polish instead of decorative polish, and the first-run and offline states that usually ship broken. Use this whenever you are building, redesigning, or refining any app, web app, PWA, dashboard, or interactive tool, and whenever someone says their thing "looks AI-generated", "looks like a template", "feels like vibecoded junk", "looks basic/ugly", or asks to make something feel like "a real app" or "polished". Also use it before shipping any app you built, as a pre-flight pass. Do not wait to be asked for a "design review" — if you are writing UI, this applies.
---

# Making an app that feels made

Generated-looking apps are rarely generated-looking because of one bad
decision. They look that way because a hundred small defaults were never
revisited: the stock success green, the empty state that swallows the screen,
the label that needs a tooltip on a device with no hover, the destructive
button with no undo. Each is individually defensible. Together they read as
*nobody looked at this*.

The single highest-value habit in this skill: **look at what you built, in the
state a real person first meets it.** Most of what follows was found that way,
not by reasoning about code.

---

## 1. The method

### Render it and actually look

Do not review your UI by reading your own source. Screenshot every screen at a
real device size and open the images.

```
# Drive the app, capture each route, then READ the images back
node screenshot.mjs   # Playwright: goto each route, page.screenshot(...)
```

You are looking for things that are invisible in code and obvious in a
picture: a colour that doesn't belong, a control with dead space beside it, a
label that wrapped mid-phrase, a drawing framed like a broken image.

Do this for **two accounts**, always:

- **A populated account** — the app doing its job.
- **A brand-new account** — the first thing a real person ever sees.

The new-account pass finds more than the populated one, and almost nobody
runs it. That is where you find the screen that hides itself, the "you are
behind" message aimed at someone who has done nothing yet, and the primary
button still labelled with placeholder text.

### Test the states your harness never creates

Your test suite runs one way: online, on a live server, with a populated
fixture, at a root path. Bugs live in every state it *doesn't* create. Go
through them deliberately:

| State | How it breaks | How to test |
|---|---|---|
| Offline / no signal | Blank screen on launch | `context.setOffline(true)`, reload |
| First run, no data | Empty states, "behind" messaging, dead CTAs | Clear storage, complete onboarding, screenshot every tab |
| Deployed sub-path (`/repo/`) | Asset 404s, blank page | Build and preview with the real base path |
| Permission denied | Silent fallback paths | Withhold clipboard/notification permission |
| Long content | Wrapped filter rows push content off-screen | Fixture with many items |
| Dark mode | Colours defined only in one theme block | Toggle and screenshot |

### Prove the fix works

Two failure modes, both common, both embarrassing:

**The fix that does nothing.** In one real case an Undo button was added to a
toast, rendered perfectly, and was completely inert — the toast layer had
`pointer-events: none` so passing messages wouldn't eat taps. Visible, styled,
dead. It was caught only by a test that actually clicked it.

So: **click the thing.** Don't assert it rendered; assert it *worked*.

**The test that passes either way.** After writing a regression test, break the
fix and confirm the test fails. A test that passes with and without the fix is
worse than no test — it is a false guarantee. If it can't fail, it isn't
testing anything.

Also make failing tests fail *fast*. A test that hangs waiting for something
that will never arrive stalls CI for its full timeout instead of reporting a
problem. Race an explicit deadline and fail with the reason.

---

## 2. The visual tells

These are the things that make people say "AI-generated". Each has a *why* —
understand the reason and you'll catch variants this list doesn't name.

### Stock semantic colours dropped into a considered palette

The loudest tell. Someone picks a thoughtful palette, then reaches for
`#0ca30c` green for success, `#d03b3b` red for danger, `#fab219` amber for
warning — traffic-light colours from no palette at all. They land on the
busiest surfaces (progress bars, status text, list rows), so they dominate.

**Fix:** derive status colours *from* your palette. Keep the hue's meaning
(green reads as good) but match the saturation and value of everything around
it. A muted herbarium green, an ochre, a brick — still instantly readable,
no longer borrowed.

### Saturated hues used for large areas

A vivid hue across a few square millimetres is *identity* — a chip, an icon, a
dot. The same hue stretched across a full-width progress bar is a highlighter.
Five rows of it and the page looks like a stationery set, shouting over the
content it belongs to.

**Fix:** keep the hue at full strength for small identity marks; pull it toward
a neutral for anything filling real area. `color-mix(in srgb, var(--hue) 62%,
var(--neutral))` is a one-line version of this.

### Gradients, emoji, confetti, blurred drop shadows, everything pill-shaped

Purple-to-blue gradients especially. These are decorative work that a border,
a rule, a weight change or a label does better and more quietly. Every one of
them is doing a job that structure should be doing.

### Basic SVG that looks like clip art

Icon-grade geometry (a circle, a rounded rect, a smiley) scaled up and used as
illustration. The tell is a thick uniform keyline around flat fill.

**Fix:** decide what visual language the marks belong to, and make illustration
obey the same rules as the icon set — same stroke weight logic, same treatment
of fill, same construction. If your icons are open paths in one weight of
`currentColor`, your illustration cannot be a keyline-plus-fill cartoon. It
will look like it came from somewhere else, because visually it did.

Also: for anything drawn as paths, **measure rather than eyeball**. Endpoints
that should meet a contour and float 4 units clear read as "rough" at a glance
without the viewer being able to say why. A script that samples path geometry
and reports gaps and sharp tangent changes finds these reliably.

### Things in front that don't occlude what's behind

If overlapping shapes use transparency, draw order tints but doesn't hide. A
body shows through the shell it's inside. Use masks or explicit depth layers
when something is supposed to be solid.

### Art framed in a bordered, filled box

A drawing inside a sunken rectangle with a hairline border is the exact
styling of an image that failed to load. Let illustration sit on the page.

### Internal concepts shown as UI

Enum names, theme keys, and system labels rendered as prominent chips. They
exist in your data model, so they got a component. Ask what the *user* gains
from seeing it. Often the answer is nothing, and the fix is to demote it, not
delete the feature.

### Implementation notes as user-facing copy

Real example, shipped: *"Both are designed rather than inverted — the eight
type colours are stepped separately for each so a vault stays legible either
way."* That is an engineer explaining their work to themselves, printed in a
settings screen. Replace with what the control does for the reader.

### Controls that hug their content

A three-option segmented control sized to its labels leaves a band of dead
panel to the right, which reads as a row that failed to draw. Either fill the
container or make the shrink deliberate and obvious.

### One crude component doing five jobs

The same 10-cell block bar used for progress, for budget, for comparison, for
share-of-total. Notice when a component's resolution is wrong for a job: eight
cells cannot separate 2,450 from 1,436, so a panel whose entire purpose is
comparison can't do it. Scale to the largest item, not the total, when the
question is "which of these is biggest".

---

## 3. Polish that has to work, not just appear

Decorative polish is cheap and reads as fake. Working polish is what makes
something feel professional. Each item below has an **applies when** test —
check it against the app you are actually building rather than adding
everything.

### Undo for anything destructive
**Applies when:** any control deletes, overwrites, or clears something the user
created.
A confirm dialog interrupts everyone to stop a rare mistake. Undo costs nobody
anything and fully recovers. If the control sits on every row of a long list,
undo isn't optional — a mis-tap on a phone is a certainty, not a risk.
Capture what you removed *before* removing it, so undo restores exactly that,
including linked records that must travel together.

### Empty states that show what exists
**Applies when:** any screen can render with no data.
The failure is an early return that swallows the whole screen. Gate only the
part that genuinely needs data. A new account usually *has* real content —
identity, level, settings, whatever it earned during setup — and hiding it
turns the most motivating screen into a blank page on day one.
Say what will fill the space, in terms of the action that fills it.

### First-run copy that doesn't blame the user
**Applies when:** the app computes pace, progress, streaks, or targets.
Anything derived from history reads as failure when there is no history.
"Behind an even pace" is a verdict delivered to someone who hasn't been given
a chance to act. State the facts, drop the judgement, name the first step.

### Labels that survive a device with no hover
**Applies when:** shipping to phones (so: almost always).
A `title` attribute is not an explanation on a touchscreen. If a label needs a
tooltip to make sense, the label is wrong. Name the thing.

### Primary actions named for what they do
**Applies when:** always, but check the empty case specifically.
On a populated screen a vague CTA hides among content. On an empty screen it
is the only control, and "Log something" reads like placeholder text nobody
replaced. Consider naming the first step explicitly when there is nothing yet.

### Controls that don't crowd out content
**Applies when:** filters, tabs, or chips scale with user data.
One chip per item means the control row grows without limit. Wrapped, it
pushes the actual content off the screen — the tools for reading the content
displacing the content. Scroll them on one line, with an item half-visible at
the edge to say there is more.

### Pending-action counts that can be acted on
**Applies when:** you show "N things ready".
A count with no control is a statement where a button belongs. If seven things
are claimable, offer to claim them.

---

## 4. Make it an app

**This one is not conditional. Apply it to every app.**

A thing that lives at a URL and a thing that lives on a home screen are
different products to the person using them. Installing is what makes it feel
owned.

### Onboarding leads with installation

Put the install instructions *before* setup, not after. On iOS, a Home Screen
web app gets its own storage container, separate from Safari — so anyone who
sets up in the browser and installs afterwards arrives at an empty app with no
explanation and no way back. Say plainly that setup belongs in the installed
app.

Draw the steps rather than describing them: "tap the Share button" only helps
someone who already knows which one that is. Inline the platform's own glyphs
next to the sentences naming them. Number them in real sequence.

Show it only where it's true:
- not already installed (`display-mode: standalone`, or `navigator.standalone`
  on iOS, which is the only signal Safari gives)
- not desktop, where home-screen install isn't the norm and the storage split
  doesn't apply
- not inside a frame, where "tap Share in Safari" names a browser the reader
  isn't looking at
- iPadOS reports a desktop user agent — detect it by touch points

Never a dead end: always offer "Continue anyway".

### A real app icon

iOS will not accept an SVG for `apple-touch-icon`. With no PNG it screenshots
your page and uses that as the icon — so the install you just asked for looks
broken the moment it lands. Ship a real 180×180 PNG.

### It opens without a connection

An installed app that needs a network round trip to boot shows a blank screen
in a tunnel. If its data is local, that's absurd — it's refusing to show you
something already on the device.

A service worker that precaches the shell fixes it. Serve the document
**network-first** so deploys still land on the next launch, and serve
content-hashed assets **cache-first** since a changed file is a different URL
and a hit can never be stale. Delete old caches on activate, or they
accumulate on every deploy and eat the storage budget the app's own data lives
in.

Verify all three: an offline cold launch renders; shipping a new build lands on
one reload; exactly one cache remains afterwards.

### Nothing is hidden under the status bar

Use `viewport-fit=cover` plus `env(safe-area-inset-*)`. Test on a notched
device profile — controls at the top of the screen are the ones that get eaten.

---

## 5. Conditional infrastructure

Check each against the app you're building.

### Local-only data needs a way out
**Applies when:** state lives in `localStorage`/IndexedDB with no account or
server.
Clearing site data — or iOS evicting storage from an app left unused — takes
everything. Export and restore aren't enough on their own: nothing ever tells
anyone to use them, and the person who most needs a backup is the one who
never opened the settings screen.
Prompt, but set the bar high enough that it never fires when there's nothing
to lose. Quiet below a handful of records, quiet when nothing changed since
the last backup, otherwise ask occasionally. Say what a wipe would actually
cost in concrete terms ("138 entries") rather than showing a warning triangle.
Count "changed since" from when a record was *created*, not its display date.
Treat restoring as a backup — at that moment the user demonstrably holds a
copy.

### Money is integers
**Applies when:** the app handles currency.
Store minor units (cents). Derive every total from the underlying records
rather than storing a running balance that can drift.

### Linked records travel together
**Applies when:** one user action creates multiple rows (a transfer, a split).
Deleting one half invents or destroys value. Give the pair a shared id and act
on the set.

### Deploy gates run what you actually ship
**Applies when:** there's CI.
Running unit tests and then deploying means the browser suite is a habit, not a
gate. Run it against the built artefact at the real base path — a wrong base
path is invisible everywhere else.
Two traps worth knowing: bind preview servers to `127.0.0.1` explicitly, since
`localhost` can resolve to `::1` first while your tools ask for IPv4 and you
get a confusing connection-refused; and grant permissions the app's happy path
needs (clipboard, etc.) or you'll test the fallback branch and misread it as a
product bug.

---

## 6. Before you call it done

Work through this against the real, built app:

- [ ] Screenshotted every screen, populated **and** brand-new, and looked at them
- [ ] No colour on screen that isn't from the palette
- [ ] No gradient, emoji, confetti, or blurred shadow doing structural work
- [ ] Illustration obeys the same construction rules as the icon set
- [ ] Every empty state shows what genuinely exists
- [ ] No copy that explains the implementation
- [ ] Every label makes sense without hover
- [ ] Every destructive action is recoverable — and the recovery was *clicked*
- [ ] Installs to the home screen, with a real icon, and opens offline
- [ ] Nothing sits under the status bar on a notched device
- [ ] New tests were confirmed to fail without the fix

When reporting the work, say what you verified and how, and name anything you
couldn't check. "I tested this in Chromium; real iOS Safari is still unchecked"
is worth more than a confident summary that quietly rests on an assumption.
