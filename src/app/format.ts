import { useMemo } from 'react'
import { currencySymbol, formatMoney, type MoneyOpts } from '@/domain/money'
import { useRawState } from '@/store/store'

export type Formatter = {
  money: (cents: number, opts?: MoneyOpts) => string
  compact: (cents: number) => string
  symbol: string
  locale: string
  currency: string
}

/** Currency formatting bound to the user's profile, memoised on it. */
export function useFormat(): Formatter {
  const { locale, currency } = useRawState().profile
  return useMemo(() => ({
    money: (cents: number, opts?: MoneyOpts) => formatMoney(cents, { locale, currency, ...opts }),
    compact: (cents: number) => formatMoney(cents, { locale, currency, compact: true }),
    symbol: currencySymbol(locale, currency),
    locale,
    currency,
  }), [locale, currency])
}
