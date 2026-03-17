'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const threshold = 80

  useEffect(() => {
    const el = document.documentElement

    function onTouchStart(e: TouchEvent) {
      if (el.scrollTop === 0) startY.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === 0) return
      const dist = e.touches[0].clientY - startY.current
      if (dist > 0 && el.scrollTop === 0) {
        setPulling(true)
        setPullDistance(Math.min(dist * 0.5, threshold + 20))
      }
    }

    async function onTouchEnd() {
      if (pullDistance >= threshold) {
        setRefreshing(true)
        setPullDistance(0)
        setPulling(false)
        await onRefresh()
        setRefreshing(false)
      } else {
        setPulling(false)
        setPullDistance(0)
      }
      startY.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, onRefresh])

  return (
    <div style={{ position: 'relative' }}>
      {/* مؤشر السحب */}
      {(pulling || refreshing) && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 20,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'opacity 0.2s',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            border: '2px solid var(--accent-blue)',
            borderTopColor: 'transparent',
            animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
            transform: !refreshing ? `rotate(${(pullDistance / threshold) * 360}deg)` : undefined,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {refreshing ? 'جاري التحديث...' : pullDistance >= threshold ? 'اترك للتحديث ↑' : 'اسحب للتحديث ↓'}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

export function PullToRefreshIndicator({ refreshing }: { refreshing: boolean }) {
  if (!refreshing) return null
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 20,
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        border: '2px solid var(--accent-blue)',
        borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
        جاري التحديث...
      </span>
    </div>
  )
}
