import { getCurrencyDecimals, CURRENCIES, CURRENCIES_BY_GROUP, CURRENCY_MAP } from '@/lib/currencies'

describe('lib/currencies', () => {
  it('should return correct decimals for various currencies', () => {
    expect(getCurrencyDecimals('JOD')).toBe(3)
    expect(getCurrencyDecimals('USD')).toBe(2)
    expect(getCurrencyDecimals('JPY')).toBe(0)
    expect(getCurrencyDecimals('KWD')).toBe(3)
    expect(getCurrencyDecimals('UNKNOWN')).toBe(2) // Default fallback
  })

  it('should have correct groupings in CURRENCIES_BY_GROUP', () => {
    expect(CURRENCIES_BY_GROUP.arabic.some(c => c.value === 'JOD')).toBe(true)
    expect(CURRENCIES_BY_GROUP.islamic.some(c => c.value === 'TRY')).toBe(true)
    expect(CURRENCIES_BY_GROUP.global.some(c => c.value === 'USD')).toBe(true)
  })

  it('should have complete mapping in CURRENCY_MAP', () => {
    expect(CURRENCY_MAP['SAR']).toBeDefined()
    expect(CURRENCY_MAP['SAR'].labelAr).toBe('ريال سعودي')
    expect(CURRENCY_MAP['EUR'].flag).toBe('🇪🇺')
  })

  it('should have the expected number of total currencies', () => {
    expect(CURRENCIES.length).toBe(35)
  })
})
