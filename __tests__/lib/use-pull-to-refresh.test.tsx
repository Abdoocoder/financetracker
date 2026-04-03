import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { usePullToRefresh } from '../../lib/use-pull-to-refresh'

// jsdom does not implement the Touch constructor — polyfill it
if (typeof Touch === 'undefined') {
  ;(global as any).Touch = class Touch {
    identifier: number; target: EventTarget
    clientX = 0; clientY = 0; screenX = 0; screenY = 0
    pageX = 0; pageY = 0; radiusX = 0; radiusY = 0
    rotationAngle = 0; force = 0
    constructor(opts: any) { Object.assign(this, opts) }
  }
}

function PullContainer({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { el, refreshing } = usePullToRefresh(onRefresh)
  return (
    <div ref={el} data-testid="container">
      {refreshing ? 'refreshing' : 'idle'}
    </div>
  )
}

describe('usePullToRefresh', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true })
  })

  it('renders in idle state initially', () => {
    render(<PullContainer onRefresh={jest.fn().mockResolvedValue(undefined)} />)
    expect(screen.getByText('idle')).toBeTruthy()
  })

  it('does not trigger refresh for small pull (< 80px)', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(<PullContainer onRefresh={onRefresh} />)
    const container = getByTestId('container')

    await act(async () => {
      container.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: container, clientY: 100 })],
        bubbles: true,
      }))
      container.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 1, target: container, clientY: 150 })],
        bubbles: true,
      }))
    })

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('triggers refresh when pulled > 80px downward', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(<PullContainer onRefresh={onRefresh} />)
    const container = getByTestId('container')

    await act(async () => {
      container.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: container, clientY: 100 })],
        bubbles: true,
      }))
      container.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 1, target: container, clientY: 200 })],
        bubbles: true,
      }))
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not trigger refresh when scrollY > 0 at touchstart', async () => {
    Object.defineProperty(window, 'scrollY', { value: 50, writable: true, configurable: true })
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(<PullContainer onRefresh={onRefresh} />)
    const container = getByTestId('container')

    await act(async () => {
      container.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: container, clientY: 100 })],
        bubbles: true,
      }))
      container.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 1, target: container, clientY: 300 })],
        bubbles: true,
      }))
    })

    // scrollY !== 0 at touchstart so startY stays 0; diff=300 but scrollY > 0 at touchend guard
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('removes event listeners on unmount', () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined)
    const { unmount, getByTestId } = render(<PullContainer onRefresh={onRefresh} />)
    const container = getByTestId('container')
    const removeSpy = jest.spyOn(container, 'removeEventListener')
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function))
  })
})
