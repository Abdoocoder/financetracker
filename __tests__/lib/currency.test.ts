import { formatAmount, CURRENCIES } from '@/lib/currency'

describe('lib/currency', () => {
    describe('CURRENCIES', () => {
        it('should have correct number of supported currencies', () => {
            expect(CURRENCIES.length).toBe(35)
        })

        it('should include JOD as first currency', () => {
            expect(CURRENCIES[0].value).toBe('JOD')
            expect(CURRENCIES[0].labelAr).toBe('دينار أردني')
            expect(CURRENCIES[0].flag).toBe('🇯🇴')
        })

        it('should include USD currency', () => {
            const usd = CURRENCIES.find(c => c.value === 'USD')
            expect(usd).toBeDefined()
            expect(usd?.flag).toBe('💵')
        })

        it('should have unique currency codes', () => {
            const codes = CURRENCIES.map(c => c.value)
            const uniqueCodes = new Set(codes)
            expect(uniqueCodes.size).toBe(codes.length)
        })

        it('should have correct decimals for KWD (3)', () => {
            const kwd = CURRENCIES.find(c => c.value === 'KWD')
            expect(kwd?.decimals).toBe(3)
        })

        it('should have correct decimals for JPY (0)', () => {
            const jpy = CURRENCIES.find(c => c.value === 'JPY')
            expect(jpy?.decimals).toBe(0)
        })
    })

    describe('formatAmount', () => {
        it('should format JOD with 3 decimal places', () => {
            const result = formatAmount(1234.5, 'JOD')
            expect(result).toBe('1,234.500 JOD')
        })

        it('should format USD with 2 decimal places', () => {
            const result = formatAmount(1000, 'USD')
            expect(result).toBe('1,000.00 USD')
        })

        it('should format JPY with 0 decimal places', () => {
            const result = formatAmount(1000, 'JPY')
            expect(result).toBe('1,000 JPY')
        })

        it('should handle small amounts', () => {
            const result = formatAmount(0.99, 'EUR')
            expect(result).toBe('0.99 EUR')
        })

        it('should format large amounts with commas', () => {
            const result = formatAmount(1000000.5, 'SAR')
            expect(result).toBe('1,000,000.50 SAR')
        })

        it('should handle zero', () => {
            const result = formatAmount(0, 'JOD')
            expect(result).toBe('0.000 JOD')
        })
    })
})
