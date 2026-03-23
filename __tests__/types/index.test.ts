import {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
} from '@/types'

describe('types/index', () => {
    describe('EXPENSE_CATEGORIES', () => {
        it('should have correct expense categories', () => {
            expect(EXPENSE_CATEGORIES).toContain('إيجار / قسط')
            expect(EXPENSE_CATEGORIES).toContain('مواصلات')
            expect(EXPENSE_CATEGORIES).toContain('طعام وشراب')
            expect(EXPENSE_CATEGORIES).toContain('فواتير')
            expect(EXPENSE_CATEGORIES).toContain('صحة')
            expect(EXPENSE_CATEGORIES).toContain('تعليم')
            expect(EXPENSE_CATEGORIES).toContain('ترفيه')
            expect(EXPENSE_CATEGORIES).toContain('صلة رحم')
            expect(EXPENSE_CATEGORIES).toContain('ملابس')
            expect(EXPENSE_CATEGORIES).toContain('أخرى')
        })

        it('should have 10 expense categories', () => {
            expect(EXPENSE_CATEGORIES.length).toBe(10)
        })
    })

    describe('INCOME_CATEGORIES', () => {
        it('should have correct income categories', () => {
            expect(INCOME_CATEGORIES).toContain('راتب')
            expect(INCOME_CATEGORIES).toContain('عمل حر')
            expect(INCOME_CATEGORIES).toContain('استثمار')
            expect(INCOME_CATEGORIES).toContain('مكافأة')
            expect(INCOME_CATEGORIES).toContain('أخرى')
        })

        it('should have 5 income categories', () => {
            expect(INCOME_CATEGORIES.length).toBe(5)
        })
    })
})
