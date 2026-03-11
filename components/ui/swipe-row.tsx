'use client'
import { useRef, useState } from 'react'

interface SwipeRowProps {
  children: React.ReactNode
  onDelete: () => void
  opacity?: number
}

export function SwipeRow({ children, onDelete, opacity = 1 }: SwipeRowProps) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiped, setSwiped] = useState(false)

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    // RTL: سحب يميناً (diff سالب)
    const diff = e.touches[0].clientX - startX.current
    if (diff > 0) setOffset(Math.min(diff, 90))
  }

  const onTouchEnd = () => {
    if (offset >= 70) setSwiped(true)
    else { setOffset(0); setSwiped(false) }
  }

  const reset = () => { setOffset(0); setSwiped(false) }
  const finalOffset = swiped ? 80 : offset

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, opacity }}>

      {/* Delete button — يمين */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 80,
        background: '#EF4444',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: Math.min(finalOffset / 80, 1),
        zIndex: 0,
      }}>
        <span style={{ fontSize: 22 }}>🗑</span>
      </div>

      {/* Row — يتحرك يميناً */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${finalOffset}px)`,
          transition: (offset === 0 || swiped) ? 'transform 0.2s ease' : 'none',
          position: 'relative', zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* عند السحب الكامل: زر قابل للضغط */}
      {swiped && (
        <>
          <div onClick={reset} style={{ position: 'fixed', inset: 0, zIndex: 2 }} />
          <button
            onClick={() => { onDelete(); reset() }}
            style={{
              position: 'absolute', top: '50%', right: 12,
              transform: 'translateY(-50%)',
              width: 56, height: 56, borderRadius: 14,
              background: '#EF4444', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, zIndex: 3,
              boxShadow: '0 4px 16px rgba(239,68,68,0.5)',
            }}
          >🗑</button>
        </>
      )}
    </div>
  )
}
