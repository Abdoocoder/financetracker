import { formatAmount, CURRENCIES } from '@/lib/currency'

describe('lib/currency', () => {
    describe('CURRENCIES', () => {
        it('should have correct number of supported currencies', () => {
            expect(CURRENCIES.length).toBe(8)
        })

        it('should include JOD as first currency', () => {
            expect(CURRENCIES[0].value).toBe('JOD')
            expect(CURRENCIES[0].label).toBe('دينار أردني (JOD)')
            expect(CURRENCIES[0].icon).toBe('🇯🇴')
        })

        it('should include USD currency', () => {
            const usd = CURRENCIES.find(c => c.value === 'USD')
            expect(usd).toBeDefined()
            expect(usd?.icon).toBe('💵')
        })

        it('should have unique currency codes', () => {
            const codes = CURRENCIES.map(c => c.value)
            const uniqueCodes = new Set(codes)
            expect(uniqueCodes.size).toBe(codes.length)
        })
    })

    describe('formatAmount', () => {
        it('should format amount with 2 decimal places', () => {
            const result = formatAmount(1234.5, 'JOD')
            expect(result).toBe('1,234.50 JOD')
        })

        it('should format whole numbers correctly', () => {
            const result = formatAmount(1000, 'USD')
            expect(result).toBe('1,000.00 USD')
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
            expect(result).toBe('0.00 JOD')
        })
    })
})
