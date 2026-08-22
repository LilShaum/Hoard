import type { Platform } from '@/app/install'

/**
 * The first thing anyone sees, before setup.
 *
 * It leads rather than follows because of a real constraint: an iOS Home Screen
 * app has its own storage container, separate from Safari. Someone who sets up
 * in the browser and installs afterwards arrives at an empty app with no
 * explanation. Ten seconds of instruction here avoids that entirely.
 */

/* The glyphs are drawn rather than described, because "tap the share button"
   only helps if you already know which one that is. */

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.2V3.4" />
      <path d="M8.4 7 12 3.4 15.6 7" />
      <path d="M7 10.4H5.6A1.6 1.6 0 0 0 4 12v7.4A1.6 1.6 0 0 0 5.6 21h12.8a1.6 1.6 0 0 0 1.6-1.6V12a1.6 1.6 0 0 0-1.6-1.6H17" />
    </svg>
  )
}

function AddBoxGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4" />
      <path d="M12 8.2v7.6M8.2 12h7.6" />
    </svg>
  )
}

function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="19" r="1.9" />
    </svg>
  )
}

type Step = { glyph?: React.ReactNode; text: React.ReactNode }

const IOS_STEPS: Step[] = [
  { glyph: <ShareGlyph />, text: <>Tap the <strong>Share</strong> button — the box with an arrow, at the bottom of Safari.</> },
  { glyph: <AddBoxGlyph />, text: <>Scroll down the list and tap <strong>Add to Home Screen</strong>.</> },
  { text: <>Tap <strong>Add</strong> in the top corner.</> },
  { text: <>Open <strong>Hoard</strong> from your Home Screen — the new icon.</> },
]

const ANDROID_STEPS: Step[] = [
  { glyph: <MenuGlyph />, text: <>Tap the <strong>three-dot menu</strong> in the top corner of Chrome.</> },
  { glyph: <AddBoxGlyph />, text: <>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).</> },
  { text: <>Confirm, then open <strong>Hoard</strong> from your Home Screen.</> },
]

/**
 * Only mobile gets this step. On a desktop browser a home-screen install is
 * neither the norm nor necessary — the storage split that makes it urgent on
 * iOS does not apply — so prompting there would be pure noise before setup.
 */
export type InstallPlatform = Exclude<Platform, 'desktop'>

const COPY: Record<InstallPlatform, { title: string; lead: string; steps: Step[] }> = {
  ios: {
    title: 'Add Hoard to your Home Screen',
    lead: 'Hoard runs as a real app on your iPhone — full screen, no browser bars, works offline. It takes about ten seconds.',
    steps: IOS_STEPS,
  },
  android: {
    title: 'Add Hoard to your Home Screen',
    lead: 'Hoard runs as a real app on your phone — full screen, no browser bars, works offline. It takes about ten seconds.',
    steps: ANDROID_STEPS,
  },
}

export function InstallStep({ platform }: { platform: InstallPlatform }) {
  const copy = COPY[platform]

  return (
    <div className="onboard__step">
      <h1 id="onboarding-title" className="onboard__title">{copy.title}</h1>
      <p className="muted">{copy.lead}</p>

      <ol className="installsteps">
        {copy.steps.map((step, i) => (
          <li key={i} className="installstep">
            <span className="installstep__n num" aria-hidden>{i + 1}</span>
            <span className="installstep__body">
              {step.glyph && <span className="installstep__glyph">{step.glyph}</span>}
              <span>{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="installnote">
        <strong>Set it up in the app, not here.</strong>{' '}
        {platform === 'ios'
          ? 'A Home Screen app on iPhone keeps its own separate storage, so anything you enter in Safari first will not carry across.'
          : 'Set-up done in the browser may not carry across to the installed app.'}
      </p>
    </div>
  )
}
