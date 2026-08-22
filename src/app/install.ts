/**
 * Home-screen install detection.
 *
 * The reason this matters is not polish. On iOS a Home Screen web app runs in
 * its own storage container, separate from Safari — so a hoard set up in the
 * browser does not travel to the installed app. Anyone who onboards first and
 * installs second silently loses everything, which is why the install step
 * comes before setup rather than after it.
 *
 * The detection is a pure function of the values the browser reports, so it can
 * be tested without a browser.
 */

export type Platform = 'ios' | 'android' | 'desktop'

export type Probe = {
  userAgent: string
  /** iPadOS reports a desktop UA, and is only told apart by touch points. */
  maxTouchPoints: number
  /** matchMedia('(display-mode: standalone)').matches */
  standaloneDisplay: boolean
  /** navigator.standalone — iOS only, and the only signal iOS Safari gives. */
  iosStandalone: boolean
  /** Running inside someone else's frame rather than as a page of its own. */
  embedded: boolean
}

export type InstallState = {
  platform: Platform
  /** Already running as an installed app, so the install step is pointless. */
  installed: boolean
  /**
   * True when there is no install to offer: already installed, on desktop, or
   * embedded in a frame — where "tap Share in Safari" describes a browser the
   * reader is not looking at.
   */
  canInstall: boolean
}

export function detectInstall(probe: Probe): InstallState {
  const ua = probe.userAgent || ''

  const isIphone = /iPad|iPhone|iPod/i.test(ua)
  // iPadOS 13+ claims to be a Mac; touch points are what give it away.
  const isIpadDesktopUa = /Macintosh/i.test(ua) && probe.maxTouchPoints > 1
  const isAndroid = /Android/i.test(ua)

  const platform: Platform =
    isIphone || isIpadDesktopUa ? 'ios' : isAndroid ? 'android' : 'desktop'

  const installed = probe.standaloneDisplay || probe.iosStandalone

  return {
    platform,
    installed,
    canInstall: !installed && !probe.embedded && platform !== 'desktop',
  }
}

/** Reads the live browser values. Safe to call before mount. */
export function probeInstall(): InstallState {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { platform: 'desktop', installed: false, canInstall: false }
  }
  let standaloneDisplay = false
  try {
    standaloneDisplay = window.matchMedia('(display-mode: standalone)').matches
  } catch {
    /* Older browsers without display-mode support simply report false. */
  }
  let embedded = false
  try {
    embedded = window.self !== window.top || 'claude' in window
  } catch {
    embedded = true // A cross-origin frame throws, which itself answers it.
  }

  return detectInstall({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standaloneDisplay,
    iosStandalone: (navigator as { standalone?: boolean }).standalone === true,
    embedded,
  })
}
