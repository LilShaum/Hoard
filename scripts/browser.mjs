/**
 * Launching Chromium in both places this repo runs.
 *
 * The dev sandbox ships a browser at a fixed path and blocks the download that
 * `playwright install` would do; CI has no such browser until it installs one,
 * and then Playwright knows where it is. Hardcoding the sandbox path made
 * every script here unrunnable in CI, which is why the browser suite had never
 * run on a deploy.
 */
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium'

export function launch(options = {}) {
  return chromium.launch(
    existsSync(SANDBOX_CHROMIUM)
      ? { executablePath: SANDBOX_CHROMIUM, ...options }
      : options,
  )
}
