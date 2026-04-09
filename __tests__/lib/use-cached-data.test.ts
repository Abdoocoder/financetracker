import { renderHook, waitFor, act } from '@testing-library/react'
import { useCachedData, clearAllCache } from '../../lib/use-cached-data'

beforeEach(() => {
  clearAllCache()
})

describe('useCachedData', () => {
  it('fetches data on mount and sets loading=false', async () => {
    const fetcher = jest.fn().mockResolvedValue({ value: 42 })
    const { result } = renderHook(() => useCachedData('key1', fetcher))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ value: 42 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('starts with cached data when cache is fresh', async () => {
    const fetcher = jest.fn().mockResolvedValue('fresh')
    // First render: populates cache
    const { unmount } = renderHook(() => useCachedData('key2', fetcher))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    unmount()

    // Second render: cache is fresh (within TTL), should use cached data
    const fetcher2 = jest.fn().mockResolvedValue('new-data')
    const { result } = renderHook(() => useCachedData('key2', fetcher2))
    // loading starts as false because cache hit
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('fresh')
    // fetcher2 should NOT be called (cache is fresh)
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(fetcher2).not.toHaveBeenCalled()
  })

  it('shows stale data immediately then revalidates in background', async () => {
    const fetcher = jest.fn().mockResolvedValue('initial')
    const { unmount } = renderHook(() => useCachedData('stale-key', fetcher, 0))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    unmount()

    // Second render with TTL=0 → cache is stale → shows stale + refreshes
    const fetcher2 = jest.fn().mockResolvedValue('updated')
    const { result } = renderHook(() => useCachedData('stale-key', fetcher2, 0))
    // Has stale data immediately
    expect(result.current.data).toBe('initial')
    expect(result.current.loading).toBe(false)
    // Eventually refreshes
    await waitFor(() => expect(result.current.data).toBe('updated'))
  })

  it('refresh() forces a new fetch ignoring cache', async () => {
    let callCount = 0
    const fetcher = jest.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(`fetch-${callCount}`)
    })
    const { result } = renderHook(() => useCachedData('refresh-key', fetcher))
    await waitFor(() => expect(result.current.data).toBe('fetch-1'))

    await act(async () => {
      result.current.refresh()
    })
    await waitFor(() => expect(result.current.data).toBe('fetch-2'))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalidate() removes from cache and refetches', async () => {
    let callCount = 0
    const fetcher = jest.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(`v${callCount}`)
    })
    const { result } = renderHook(() => useCachedData('inv-key', fetcher))
    await waitFor(() => expect(result.current.data).toBe('v1'))

    await act(async () => {
      result.current.invalidate()
    })
    await waitFor(() => expect(result.current.data).toBe('v2'))
  })

  it('refreshing=false initially', async () => {
    const fetcher = jest.fn().mockResolvedValue(null)
    const { result } = renderHook(() => useCachedData('r-key', fetcher))
    expect(result.current.refreshing).toBe(false)
    await act(async () => {}) // flush pending async effects
  })

  it('uses custom TTL', async () => {
    const fetcher = jest.fn().mockResolvedValue('data')
    const { result } = renderHook(() => useCachedData('ttl-key', fetcher, 99999))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBe('data')
  })
})

describe('clearAllCache', () => {
  it('clears all cached entries', async () => {
    const fetcher = jest.fn().mockResolvedValue('to-clear')
    const { unmount } = renderHook(() => useCachedData('clear-key', fetcher))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    unmount()

    clearAllCache()

    // After clear, next render should fetch again
    const fetcher2 = jest.fn().mockResolvedValue('refetched')
    const { result } = renderHook(() => useCachedData('clear-key', fetcher2))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('refetched'))
    expect(fetcher2).toHaveBeenCalledTimes(1)
  })
})
