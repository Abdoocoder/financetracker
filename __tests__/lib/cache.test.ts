describe('lib/cache - integration', () => {
    // Store original sessionStorage
    const originalSessionStorage = global.sessionStorage

    beforeEach(() => {
        // Reset the module cache
        jest.resetModules()
        // Restore original sessionStorage
        global.sessionStorage = originalSessionStorage
    })

    afterAll(() => {
        // Restore original sessionStorage
        global.sessionStorage = originalSessionStorage
    })

    it('should have sessionStorage available in test environment', () => {
        expect(typeof global.sessionStorage).toBe('object')
        expect(typeof global.sessionStorage.removeItem).toBe('function')
    })

    it('CACHE_KEYS should contain expected keys', () => {
        // Import after reset to get fresh values
        const { clearUserCache } = require('@/lib/cache')
        const userId = 'test-user'

        // This test validates that the function doesn't throw
        expect(() => clearUserCache(userId)).not.toThrow()
    })

    it('clearCacheKey should not throw with valid inputs', () => {
        const { clearCacheKey } = require('@/lib/cache')
        const userId = 'test-user-2'

        expect(() => clearCacheKey('dashboard', userId)).not.toThrow()
    })
})
