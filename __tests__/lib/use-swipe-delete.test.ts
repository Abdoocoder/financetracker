import { renderHook, act } from '@testing-library/react'
import { useSwipeToDelete } from '../../lib/use-swipe-delete'
import React from 'react'

function touchEvent(clientX: number): React.TouchEvent {
  return {
    touches: [{ clientX } as Touch],
  } as unknown as React.TouchEvent
}

describe('useSwipeToDelete', () => {
  it('has initial state: offset=0, swiped=false', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    expect(result.current.offset).toBe(0)
    expect(result.current.swiped).toBe(false)
  })

  it('exposes handlers and reset', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    expect(typeof result.current.handlers.onTouchStart).toBe('function')
    expect(typeof result.current.handlers.onTouchMove).toBe('function')
    expect(typeof result.current.handlers.onTouchEnd).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })

  it('does not change offset on touchStart alone', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    expect(result.current.offset).toBe(0)
  })

  it('sets offset when swiping left (startX > currentX)', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(100)))  // diff=100
    expect(result.current.offset).toBe(100)
  })

  it('caps offset at 100 when diff exceeds 100', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(400)))
    act(() => result.current.handlers.onTouchMove(touchEvent(100)))  // diff=300
    expect(result.current.offset).toBe(100)
  })

  it('does not increase offset for rightward swipe (diff <= 0)', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(100)))
    act(() => result.current.handlers.onTouchMove(touchEvent(200)))  // diff=-100
    expect(result.current.offset).toBe(0)
  })

  it('sets swiped=true when offset >= default threshold (80)', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(110)))  // offset=90 >= 80
    act(() => result.current.handlers.onTouchEnd())
    expect(result.current.swiped).toBe(true)
  })

  it('resets offset and swiped when offset < threshold on touchEnd', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn()))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(160)))  // offset=40 < 80
    act(() => result.current.handlers.onTouchEnd())
    expect(result.current.offset).toBe(0)
    expect(result.current.swiped).toBe(false)
  })

  it('respects custom threshold', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn(), 50))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(145)))  // offset=55 >= 50
    act(() => result.current.handlers.onTouchEnd())
    expect(result.current.swiped).toBe(true)
  })

  it('does NOT swipe when offset equals threshold minus 1', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn(), 80))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(121)))  // offset=79 < 80
    act(() => result.current.handlers.onTouchEnd())
    expect(result.current.swiped).toBe(false)
  })

  it('reset() clears both offset and swiped', () => {
    const { result } = renderHook(() => useSwipeToDelete(jest.fn(), 80))
    act(() => result.current.handlers.onTouchStart(touchEvent(200)))
    act(() => result.current.handlers.onTouchMove(touchEvent(110)))
    act(() => result.current.handlers.onTouchEnd())
    expect(result.current.swiped).toBe(true)
    act(() => result.current.reset())
    expect(result.current.offset).toBe(0)
    expect(result.current.swiped).toBe(false)
  })
})
