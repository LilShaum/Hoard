import { describe, expect, it } from 'vitest'
import { detectInstall, type Probe } from '@/app/install'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPADOS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const probe = (over: Partial<Probe> = {}): Probe => ({
  userAgent: MAC,
  maxTouchPoints: 0,
  standaloneDisplay: false,
  iosStandalone: false,
  embedded: false,
  ...over,
})

describe('platform', () => {
  it('recognises an iPhone', () => {
    expect(detectInstall(probe({ userAgent: IPHONE, maxTouchPoints: 5 })).platform).toBe('ios')
  })

  it('recognises an iPad, which claims to be a Mac', () => {
    expect(detectInstall(probe({ userAgent: IPADOS, maxTouchPoints: 5 })).platform).toBe('ios')
  })

  it('does not mistake a real Mac for an iPad', () => {
    expect(detectInstall(probe({ userAgent: MAC, maxTouchPoints: 0 })).platform).toBe('desktop')
  })

  it('does not mistake a touchscreen Mac laptop for an iPad on user agent alone', () => {
    // A Mac with a trackpad reports 0 touch points; only touch flips it.
    expect(detectInstall(probe({ userAgent: MAC })).platform).toBe('desktop')
  })

  it('recognises Android', () => {
    expect(detectInstall(probe({ userAgent: ANDROID, maxTouchPoints: 5 })).platform).toBe('android')
  })

  it('falls back to desktop for anything unrecognised', () => {
    expect(detectInstall(probe({ userAgent: '' })).platform).toBe('desktop')
    expect(detectInstall(probe({ userAgent: 'SomeNewBrowser/1.0' })).platform).toBe('desktop')
  })
})

describe('whether there is an install to offer', () => {
  it('offers one to an iPhone browsing normally', () => {
    expect(detectInstall(probe({ userAgent: IPHONE, maxTouchPoints: 5 })).canInstall).toBe(true)
  })

  it('offers nothing once installed', () => {
    expect(detectInstall(probe({ userAgent: IPHONE, iosStandalone: true })).canInstall).toBe(false)
  })

  it('offers nothing on desktop, where it is noise rather than help', () => {
    expect(detectInstall(probe({ userAgent: MAC })).canInstall).toBe(false)
  })

  it('offers nothing inside a frame, where the instructions name the wrong browser', () => {
    expect(detectInstall(probe({ userAgent: IPHONE, maxTouchPoints: 5, embedded: true })).canInstall)
      .toBe(false)
  })

  it('still offers one to Android', () => {
    expect(detectInstall(probe({ userAgent: ANDROID, maxTouchPoints: 5 })).canInstall).toBe(true)
  })
})

describe('installed detection', () => {
  it('is false in a normal browser tab', () => {
    expect(detectInstall(probe({ userAgent: IPHONE })).installed).toBe(false)
  })

  it('is true when iOS reports standalone', () => {
    expect(detectInstall(probe({ userAgent: IPHONE, iosStandalone: true })).installed).toBe(true)
  })

  it('is true when the display-mode media query matches', () => {
    expect(detectInstall(probe({ userAgent: ANDROID, standaloneDisplay: true })).installed).toBe(true)
  })

  it('accepts either signal, since iOS only gives one of them', () => {
    expect(detectInstall(probe({ standaloneDisplay: true })).installed).toBe(true)
    expect(detectInstall(probe({ iosStandalone: true })).installed).toBe(true)
  })
})
