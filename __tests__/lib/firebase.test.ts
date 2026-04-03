const mockGetApps = jest.fn()
const mockInitializeApp = jest.fn(() => ({}))
const mockGetToken = jest.fn()
const mockGetMessaging = jest.fn(() => ({}))
const mockOnMessage = jest.fn()

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApps: mockGetApps,
}))

jest.mock('firebase/messaging', () => ({
  getMessaging: mockGetMessaging,
  getToken: mockGetToken,
  onMessage: mockOnMessage,
}))

// Mock navigator.serviceWorker for token tests
const mockRegister = jest.fn()

import { getFCMToken } from '../../lib/firebase'

describe('getFCMToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetApps.mockReturnValue([])
    Object.defineProperty(window, 'navigator', {
      value: {
        ...window.navigator,
        serviceWorker: { register: mockRegister },
      },
      writable: true,
      configurable: true,
    })
  })

  it('returns a token when getToken succeeds', async () => {
    mockRegister.mockResolvedValue({})
    mockGetToken.mockResolvedValue('mock-fcm-token-123')

    const token = await getFCMToken()
    expect(token).toBe('mock-fcm-token-123')
  })

  it('returns null when getToken throws an error', async () => {
    mockRegister.mockResolvedValue({})
    mockGetToken.mockRejectedValue(new Error('Messaging error'))

    const token = await getFCMToken()
    expect(token).toBeNull()
  })

  it('returns null when serviceWorker.register rejects', async () => {
    mockRegister.mockRejectedValue(new Error('SW registration failed'))

    const token = await getFCMToken()
    expect(token).toBeNull()
  })

  it('returns null when getToken returns empty string', async () => {
    mockRegister.mockResolvedValue({})
    mockGetToken.mockResolvedValue('')

    const token = await getFCMToken()
    expect(token).toBe('')
  })

  it('uses existing app when getApps returns a non-empty array', async () => {
    const existingApp = { name: 'existing' }
    mockGetApps.mockReturnValue([existingApp])
    mockRegister.mockResolvedValue({})
    mockGetToken.mockResolvedValue('token-with-existing-app')

    const token = await getFCMToken()
    // initializeApp should NOT be called again since app already exists
    expect(mockInitializeApp).not.toHaveBeenCalled()
    expect(token).toBe('token-with-existing-app')
  })
})
