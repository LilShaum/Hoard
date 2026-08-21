import type { Cents } from './types'

/**
 * Money is integer cents everywhere. The only places a float is allowed are
 * parsing user input and rendering — both of which live in this file.
 */

export function toCents(amount: number): Cents {
  return Math.round(amount * 100)
}

export function toUnits(cents: Cents): number {
  return cents / 100
}

/** Parses free-text input: '12', '12.5', '$1,234.56', '1 234,56'. */
export function parseAmount(input: string): Cents | null {
  if (typeof input !== 'string') return null
  let s = input.trim().replace(/[^\d.,-]/g, '')
  if (!s) return null
  const negative = s.startsWith('-')
  s = s.replace(/-/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal one.
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const groupSep = decimalSep === ',' ? '.' : ','
    s = s.split(groupSep).join('').replace(decimalSep, '.')
  } else if (lastComma > -1) {
    // A lone comma is a decimal separator only if it looks like one.
    s = s.length - lastComma - 1 <= 2 ? s.replace(',', '.') : s.split(',').join('')
  }
  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null

  // Deliberately *not* `Math.round(Number(s) * 100)`. In binary, 1.005 is
  // 1.00499999…, so that route silently returns 100 cents instead of 101.
  // Splitting the string keeps the user's digits exactly as they typed them.
  const [intPart = '0', fracPart = ''] = s.split('.')
  const whole = Number(intPart || '0')
  const frac2 = Number((fracPart + '000').slice(0, 2))
  const thirdDigit = Number((fracPart + '000')[2])
  if (!Number.isFinite(whole)) return null

  let cents = whole * 100 + frac2 + (thirdDigit >= 5 ? 1 : 0)
  if (!Number.isSafeInteger(cents)) return null
  return negative ? -cents : cents
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function formatter(locale: string, currency: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${currency}|${JSON.stringify(opts)}`
  let f = formatterCache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, { style: 'currency', currency, ...opts })
    } catch {
      f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', ...opts })
    }
    formatterCache.set(key, f)
  }
  return f
}

export type MoneyOpts = {
  locale?: string
  currency?: string
  /** Drop '.00' when the amount is whole. Default true. */
  trimZeros?: boolean
  /** Render 12,400 as '12.4k'. Default false. */
  compact?: boolean
  /** Always show a leading + or −. Default false. */
  signed?: boolean
}

export function formatMoney(cents: Cents, opts: MoneyOpts = {}): string {
  const {
    locale = 'en-US',
    currency = 'USD',
    trimZeros = true,
    compact = false,
    signed = false,
  } = opts
  const abs = Math.abs(cents)
  const units = abs / 100
  const whole = abs % 100 === 0

  let body: string
  if (compact && abs >= 100_000) {
    body = formatter(locale, currency, {
      notation: 'compact',
      maximumFractionDigits: units >= 100_000 ? 0 : 1,
    }).format(units)
  } else {
    const digits = trimZeros && whole ? 0 : 2
    body = formatter(locale, currency, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(units)
  }

  if (cents < 0) return `−${body}`
  if (signed && cents > 0) return `+${body}`
  return body
}

/** The bare currency symbol, for input prefixes. */
export function currencySymbol(locale = 'en-US', currency = 'USD'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' },
  { code: 'DKK', label: 'Danish Krone' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'PLN', label: 'Polish Zloty' },
] as const

/** Percentage 0–1, guarding the target === 0 case that produces NaN/Infinity. */
export function ratio(value: number, of: number): number {
  if (!Number.isFinite(of) || of <= 0) return 0
  const r = value / of
  return Number.isFinite(r) ? Math.max(0, r) : 0
}

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}
