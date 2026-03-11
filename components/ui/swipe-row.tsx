'use client'
import { useSwipeToDelete } from '@/lib/use-swipe-delete'

interface SwipeRowProps {
  children: React.ReactNode
  onDelete: () => void
  opacity?: number
}

export function SwipeRow({ children, onDelete, opacity = 1 }: SwipeRowProps) {
  const { offset, swiped, handlers, reset } = useSwipeToDelete(onDelete)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
      {/* Delete background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 80,
        background: 'var(--accent-red-dim)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: Math.min(offset / 80, 1),
        transition: swiped ? 'none' : 'opacity 0.1s',
      }}>
        <span style={{ fontSize: 18 }}>🗑</span>
      </div>

      {/* Row content */}
      <div
        {...handlers}
        style={{
          transform: `translateX(${swiped ? -80 : -offset}px)`,
          transition: swiped ? 'transform 0.2s ease' : 'none',
          opacity,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* Swiped state: show delete button */}
      {swiped && (
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <button
            onClick={() => { onDelete(); reset() }}
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--accent-red)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
            }}
          >🗑</button>
        </div>
      )}

      {/* Tap anywhere else to reset */}
      {swiped && (
        <div
          onClick={reset}
          style={{ position: 'fixed', inset: 0, zIndex: 1 }}
        />
      )}
    </div>
  )
}
