// jest.mock is hoisted — cannot reference outer const variables inside factory.
// Solution: use inline jest.fn() and access mocks via the imported module.
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}))

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(),
  onMessage: jest.fn(),
}))

import { initializeApp, getApps } from 'firebase/app'
import { getToken, getMessaging } from 'firebase/messaging'
import { getFCMToken } from '../../lib/firebase'

const mockGetApps     = getApps as jest.Mock
const mockGetToken    = getToken as jest.Mock
const mockGetMessaging = getMessaging as jest.Mock
const mockInitializeApp = initializeApp as jest.Mock

// Mock navigator.serviceWorker
const mockRegister = jest.fn()

describe('getFCMToken', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetApps.mockReturnValue([])
    mockGetMessaging.mockReturnValue({})
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

  it('returns null when getToken throws', async () => {
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

  it('returns empty string when getToken returns empty string', async () => {
    mockRegister.mockResolvedValue({})
    mockGetToken.mockResolvedValue('')

    const token = await getFCMToken()
    expect(token).toBe('')
  })

  it('does not call initializeApp when getApps returns existing app', async () => {
    mockGetApps.mockReturnValue([{ name: 'existing' }])
    mockRegister.mockResolvedValue({})
    mockGetToken.mockResolvedValue('token-reuse')

    const token = await getFCMToken()
    expect(mockInitializeApp).not.toHaveBeenCalled()
    expect(token).toBe('token-reuse')
  })
})
