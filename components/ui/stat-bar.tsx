'use client'
interface Stat { label: string; value: string; color?: string; icon?: string }
export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10, marginBottom: 16 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '12px 10px', textAlign: 'center',
        }}>
          {s.icon && <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>}
          <div style={{
            fontSize: 18, fontWeight: 900, fontFamily: 'monospace',
            color: s.color ?? 'var(--text-primary)', letterSpacing: '-0.02em',
          }}>{s.value}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}
