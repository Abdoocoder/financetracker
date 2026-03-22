'use client'

export const CURRENCIES = [
  { value: 'JOD', label: 'دينار أردني (JOD)', icon: '🇯🇴' },
  { value: 'USD', label: 'دولار أمريكي (USD)', icon: '💵' },
  { value: 'EUR', label: 'يورو (EUR)', icon: '🇪🇺' },
  { value: 'SAR', label: 'ريال سعودي (SAR)', icon: '🇸🇦' },
  { value: 'AED', label: 'درهم إماراتي (AED)', icon: '🇦🇪' },
  { value: 'KWD', label: 'دينار كويتي (KWD)', icon: '🇰🇼' },
  { value: 'TRY', label: 'ليرة تركية (TRY)', icon: '🇹🇷' },
  { value: 'GBP', label: 'جنيه إسترليني (GBP)', icon: '🇬🇧' },
]

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
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency
}
