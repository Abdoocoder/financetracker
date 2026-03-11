'use client'
import { useSwipeable } from 'react-swipeable'
import { useState } from 'react'

interface SwipeRowProps {
  children: React.ReactNode
  onDelete: () => void
  opacity?: number
}

export function SwipeRow({ children, onDelete, opacity = 1 }: SwipeRowProps) {
  const [revealed, setRevealed] = useState(false)

  const handlers = useSwipeable({
    onSwipedLeft: () => setRevealed(true),
    onSwipedRight: () => setRevealed(false),
    trackMouse: false,
    delta: 50,
  })

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      {/* خلفية الحذف */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(239,68,68,0.15)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        paddingLeft: 20,
        opacity: revealed ? 1 : 0,
        transition: 'opacity 0.2s',
        zIndex: 2,
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); setRevealed(false) }}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#EF4444', border: 'none',
            cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
          }}
        >🗑</button>
      </div>

      {/* المحتوى */}
      <div
        {...handlers}
        style={{
          transform: revealed ? 'translateX(-70px)' : 'translateX(0)',
          transition: 'transform 0.25s ease',
          opacity,
          position: 'relative', zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* إغلاق عند الضغط خارج */}
      {revealed && (
        <div
          onClick={() => setRevealed(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        />
      )}
    </div>
  )
}
