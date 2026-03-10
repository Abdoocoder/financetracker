'use client'
interface EmptyStateProps { icon: string; title: string; subtitle?: string; action?: React.ReactNode }
export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 20px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 20,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{subtitle}</div>}
      {action}
    </div>
  )
}
