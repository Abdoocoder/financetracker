'use client'

export { CURRENCIES, CURRENCIES_BY_GROUP, CURRENCY_MAP, getCurrencyDecimals } from './currencies'
export type { CurrencyInfo, CurrencyGroup, GroupedCurrency } from './currencies'
import { getCurrencyDecimals } from './currencies'

export interface ExchangeRateResponse {
  base: string
  target: string
  rate: number
}

export async function fetchExchangeRate(base: string, target: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/exchange-rate?base=${base}&target=${target}`)
    if (!res.ok) return null
    const data: ExchangeRateResponse = await res.json()
    return data.rate
  } catch (err) {
    console.error('Failed to fetch exchange rate:', err)
    return null
  }
}

export function formatAmount(amount: number, currency: string) {
  const decimals = getCurrencyDecimals(currency)
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount) + ' ' + currency
}
