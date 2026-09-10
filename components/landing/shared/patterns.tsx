'use client'

export function ArabesquePattern({ className = '', opacity = 0.05 }: { className?: string; opacity?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <path
        d="M200 0C200 0 220 40 260 60C300 80 340 60 340 100C340 140 300 160 260 140C220 120 200 80 200 80C200 80 180 120 140 140C100 160 60 140 60 100C60 60 100 80 140 60C180 40 200 0 200 0Z"
        fill="currentColor"
      />
      <path
        d="M0 200C0 200 40 220 60 260C80 300 60 340 100 340C140 340 160 300 140 260C120 220 80 200 80 200C80 200 120 180 140 140C160 100 140 60 100 60C60 60 80 100 60 140C40 180 0 200 0 200Z"
        fill="currentColor"
      />
      <path
        d="M400 200C400 200 360 220 340 260C320 300 340 340 300 340C260 340 240 300 260 260C280 220 320 200 320 200C320 200 280 180 260 140C240 100 260 60 300 60C340 60 320 100 340 140C360 180 400 200 400 200Z"
        fill="currentColor"
      />
      <path
        d="M200 400C200 400 220 360 260 340C300 320 340 340 340 300C340 260 300 240 260 260C220 280 200 320 200 320C200 320 180 280 140 260C100 240 60 260 60 300C60 340 100 320 140 340C180 360 200 400 200 400Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function GeometricAccent({ className = '', variant = 'circle' }: { className?: string; variant?: 'circle' | 'diamond' | 'hexagon' }) {
  if (variant === 'diamond') {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2L38 20L20 38L2 20L20 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M20 10L28 20L20 30L12 20L20 10Z" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    )
  }

  if (variant === 'hexagon') {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    )
  }

  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  )
}

export function SectionDivider() {
  return (
    <div style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '0 auto' }} />
  )
}
