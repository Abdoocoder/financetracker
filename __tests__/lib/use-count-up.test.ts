import { renderHook, act } from '@testing-library/react'
import { useCountUp } from '../../lib/use-count-up'

// Manual RAF mock: each call queues the callback, tick() flushes them.
let currentTime = 0
const pendingFrames: Array<(ts: number) => void> = []

function tick(ms: number) {
  currentTime += ms
  const frames = pendingFrames.splice(0)
  frames.forEach(cb => cb(currentTime))
}

beforeEach(() => {
  currentTime = 0
  pendingFrames.length = 0
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    pendingFrames.push(cb)
    return pendingFrames.length
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn())
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useCountUp', () => {
  it('returns 0 immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp(0))
    expect(result.current).toBe(0)
  })

  it('starts at 0 before any frame is processed', () => {
    const { result } = renderHook(() => useCountUp(100, 500))
    expect(result.current).toBe(0)
  })

  it('reaches exact target after animation completes', () => {
    const { result } = renderHook(() => useCountUp(100, 500))
    // First frame sets startTime (must use positive ts to avoid !startTime falsy issue)
    act(() => tick(100))   // ts=100, startTime=100, progress=0
    act(() => tick(700))   // ts=800, progress=(800-100)/500=1.4 → clamped to 1 → setValue(100)
    expect(result.current).toBe(100)
  })

  it('animates partially toward target mid-animation', () => {
    const { result } = renderHook(() => useCountUp(100, 1000))
    act(() => tick(100))   // startTime=100
    act(() => tick(400))   // ts=500, progress=0.4, value=eased(0.4)*100 > 0
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)
  })

  it('uses default duration of 1000ms', () => {
    const { result } = renderHook(() => useCountUp(50))
    act(() => tick(100))   // startTime=100
    act(() => tick(1100))  // ts=1200, progress=(1200-100)/1000=1.1 → clamped to 1 → setValue(50)
    expect(result.current).toBe(50)
  })

  it('resets to 0 when target changes to 0', () => {
    const { rerender, result } = renderHook(({ t }) => useCountUp(t), {
      initialProps: { t: 100 },
    })
    rerender({ t: 0 })
    expect(result.current).toBe(0)
  })

  it('cancels animation frame on unmount', () => {
    const { unmount } = renderHook(() => useCountUp(100, 1000))
    act(() => tick(100))   // first frame runs, queues second frame
    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('does not call requestAnimationFrame when target is 0', () => {
    renderHook(() => useCountUp(0))
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('handles negative target', () => {
    const { result } = renderHook(() => useCountUp(-100, 500))
    act(() => tick(100))
    act(() => tick(700))
    expect(result.current).toBe(-100)
  })
})
