'use client'
interface AddButtonProps { label: string; onClick: () => void }
export function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 16px', borderRadius: 12,
      background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
      color: 'white', fontSize: 13, fontWeight: 700,
      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: '0 4px 16px var(--accent-blue-glow)',
      transition: 'opacity 0.15s',
    }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
       onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> {label}
    </button>
  )
}
