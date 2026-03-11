'use client'
interface Props { refreshing: boolean }
export function PullToRefreshIndicator({ refreshing }: Props) {
  if (!refreshing) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px',
      background: 'var(--accent-blue-dim)',
      borderBottom: '1px solid rgba(59,126,246,0.2)',
    }}>
      <div className="animate-spin-slow" style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid rgba(59,126,246,0.3)',
        borderTop: '2px solid var(--accent-blue)',
        marginLeft: 8,
      }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue-light)' }}>
        جاري التحديث...
      </span>
    </div>
  )
}
