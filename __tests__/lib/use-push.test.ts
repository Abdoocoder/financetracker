// Mock supabase before import
const mockGetSession = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getSession: mockGetSession },
  })),
}))

import { renderHook, act, waitFor } from '@testing-library/react'
import { usePush } from '../../lib/use-push'

// Helpers to set up browser environment mocks
function setupServiceWorkerSupport(supported = true) {
  if (supported) {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: jest.fn().mockResolvedValue(null),
            subscribe: jest.fn(),
          },
        }),
        register: jest.fn().mockResolvedValue({
          pushManager: {
            subscribe: jest.fn().mockResolvedValue({
              toJSON: jest.fn().mockReturnValue({ endpoint: 'https://push.example.com', keys: {} }),
            }),
          },
        }),
      },
      writable: true,
      configurable: true,
    })
    ;(window as any).PushManager = {}
  } else {
    // Remove serviceWorker from navigator
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    delete (window as any).PushManager
  }
}

describe('usePush', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupServiceWorkerSupport(true)
    ;(global as any).Notification = {
      requestPermission: jest.fn().mockResolvedValue('granted'),
    }
  })

  afterEach(() => {
    delete (global as any).Notification
  })

  it('returns initial state with required properties', () => {
    const { result } = renderHook(() => usePush())
    expect(typeof result.current.supported).toBe('boolean')
    expect(typeof result.current.subscribed).toBe('boolean')
    expect(result.current.loading).toBe(false)
    expect(typeof result.current.subscribe).toBe('function')
    expect(typeof result.current.unsubscribe).toBe('function')
  })

  it('detects serviceWorker support', async () => {
    const { result } = renderHook(() => usePush())
    await waitFor(() => {
      expect(typeof result.current.supported).toBe('boolean')
    })
  })

  it('subscribe returns ok:false when permission denied', async () => {
    ;(global as any).Notification.requestPermission = jest.fn().mockResolvedValue('denied')
    const { result } = renderHook(() => usePush())

    let res: any
    await act(async () => {
      res = await result.current.subscribe()
    })

    expect(res).toEqual({ ok: false, reason: 'permission_denied' })
  })

  it('subscribe returns ok:false when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    const { result } = renderHook(() => usePush())

    let res: any
    await act(async () => {
      res = await result.current.subscribe()
    })

    expect(res).toEqual({ ok: false })
  })

  it('subscribe handles error and returns ok:false with reason', async () => {
    ;(global as any).Notification.requestPermission = jest.fn().mockRejectedValue(new Error('perm error'))
    const { result } = renderHook(() => usePush())

    let res: any
    await act(async () => {
      res = await result.current.subscribe()
    })

    expect(res).toHaveProperty('ok', false)
    expect(res).toHaveProperty('reason')
  })

  it('unsubscribe does nothing when no subscription exists', async () => {
    const { result } = renderHook(() => usePush())
    await act(async () => {
      await result.current.unsubscribe()
    })
    expect(result.current.subscribed).toBe(false)
  })

  it('unsubscribe handles serviceWorker errors gracefully', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.reject(new Error('SW not available')),
      },
      writable: true,
      configurable: true,
    })
    const { result } = renderHook(() => usePush())
    // Should not throw
    await act(async () => {
      await result.current.unsubscribe()
    })
    expect(result.current.loading).toBe(false)
  })

  it('sets loading=false after subscribe completes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    const { result } = renderHook(() => usePush())

    await act(async () => {
      await result.current.subscribe()
    })

    expect(result.current.loading).toBe(false)
  })
})
