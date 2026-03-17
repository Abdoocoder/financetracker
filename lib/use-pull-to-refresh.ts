'use client'
import { useEffect, useRef, useState } from 'react'

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startY.current = e.touches[0].clientY
    }

    const onTouchEnd = async (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientY - startY.current
      if (diff > 80 && window.scrollY === 0 && !refreshing) {
        setRefreshing(true)
        await onRefresh()
        setRefreshing(false)
      }
      startY.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, refreshing])

  return { el, refreshing }
}
