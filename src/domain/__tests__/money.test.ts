import { describe, expect, it } from 'vitest'
import { clamp01, currencySymbol, formatMoney, parseAmount, ratio, toCents, toUnits } from '../money'

describe('parseAmount', () => {
  it('reads plain numbers', () => {
    expect(parseAmount('12')).toBe(1200)
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('12.55')).toBe(1255)
    expect(parseAmount('0.01')).toBe(1)
  })

  it('strips currency symbols and whitespace', () => {
    expect(parseAmount('$12.50')).toBe(1250)
    expect(parseAmount('  £7 ')).toBe(700)
    expect(parseAmount('€1,234.56')).toBe(123456)
  })

  it('handles European separators', () => {
    expect(parseAmount('1.234,56')).toBe(123456)
    expect(parseAmount('1234,56')).toBe(123456)
  })

  it('treats a comma with three trailing digits as a thousands separator', () => {
    expect(parseAmount('1,234')).toBe(123400)
    expect(parseAmount('12,345,678')).toBe(1234567800)
  })

  it('rounds sub-cent input rather than storing a float', () => {
    expect(parseAmount('1.005')).toBe(101)
    expect(Number.isInteger(parseAmount('9.999')!)).toBe(true)
  })

  it('rejects junk', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('...')).toBeNull()
  })

  it('keeps a leading minus', () => {
    expect(parseAmount('-5')).toBe(-500)
  })
})

describe('formatMoney', () => {
  it('trims .00 on whole amounts by default', () => {
    expect(formatMoney(1200)).toBe('$12')
    expect(formatMoney(1250)).toBe('$12.50')
  })

  it('can keep the cents', () => {
    expect(formatMoney(1200, { trimZeros: false })).toBe('$12.00')
  })

  it('uses a real minus sign for negatives', () => {
    expect(formatMoney(-1200)).toBe('−$12')
  })

  it('signs positives on request', () => {
    expect(formatMoney(1200, { signed: true })).toBe('+$12')
    expect(formatMoney(0, { signed: true })).toBe('$0')
  })

  it('compacts only large amounts', () => {
    expect(formatMoney(1_240_000, { compact: true })).toBe('$12.4K')
    expect(formatMoney(5000, { compact: true })).toBe('$50')
  })

  it('respects locale and currency', () => {
    expect(formatMoney(123456, { locale: 'en-GB', currency: 'GBP' })).toBe('£1,234.56')
  })

  it('falls back instead of throwing on a bad currency code', () => {
    expect(() => formatMoney(100, { currency: 'NOPE' })).not.toThrow()
  })
})

describe('helpers', () => {
  it('converts units', () => {
    expect(toCents(12.34)).toBe(1234)
    expect(toUnits(1234)).toBe(12.34)
    expect(toCents(0.1 + 0.2)).toBe(30) // no float dust
  })

  it('never divides by zero', () => {
    expect(ratio(50, 0)).toBe(0)
    expect(ratio(50, 100)).toBe(0.5)
    expect(ratio(-5, 100)).toBe(0)
  })

  it('clamps', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(0.4)).toBe(0.4)
  })

  it('finds a symbol for common currencies', () => {
    expect(currencySymbol('en-US', 'USD')).toBe('$')
    expect(currencySymbol('en-GB', 'GBP')).toBe('£')
  })
})
