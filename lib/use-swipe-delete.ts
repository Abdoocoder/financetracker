'use client'
import { useRef, useState } from 'react'

export function useSwipeToDelete(onDelete: () => void, threshold = 80) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiped, setSwiped] = useState(false)

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const diff = startX.current - e.touches[0].clientX
    if (diff > 0) setOffset(Math.min(diff, 100))
  }

  const onTouchEnd = () => {
    if (offset >= threshold) {
      setSwiped(true)
    } else {
      setOffset(0)
      setSwiped(false)
    }
  }

  const reset = () => { setOffset(0); setSwiped(false) }

  const handlers = { onTouchStart, onTouchMove, onTouchEnd }

  return { offset, swiped, handlers, reset }
}
