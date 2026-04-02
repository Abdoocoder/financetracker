import { hapticImpact } from '@/lib/haptic'

describe('lib/haptic', () => {
    const originalNavigator = global.navigator

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should call vibrate when navigator.vibrate is available', () => {
        const vibrateMock = jest.fn()
        Object.defineProperty(global, 'navigator', {
            value: { vibrate: vibrateMock },
            configurable: true
        })

        hapticImpact('medium')
        expect(vibrateMock).toHaveBeenCalledWith(10)

        hapticImpact('heavy')
        expect(vibrateMock).toHaveBeenCalledWith(15)

        hapticImpact('light')
        expect(vibrateMock).toHaveBeenCalledWith(5)

        Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true })
    })

    it('should not throw when navigator.vibrate is missing', () => {
        Object.defineProperty(global, 'navigator', {
            value: {},
            configurable: true
        })

        expect(() => hapticImpact('medium')).not.toThrow()

        Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true })
    })

    it('should handle undefined navigator gracefully', () => {
        const originalVal = global.navigator
        // @ts-ignore
        delete global.navigator
        
        expect(() => hapticImpact('light')).not.toThrow()
        
        global.navigator = originalVal
    })
})
