"use client"

import { useState } from "react"

// ── Stat Badge ──────────────────────────────────────
export function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

// ── Section Card ─────────────────────────────────────
export function SectionCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${accent ? `${accent}33` : 'var(--border)'}`,
      borderRadius: 20,
      padding: '20px',
      boxShadow: 'var(--shadow-card)',
    }}>
      {children}
    </div>
  )
}

// ── Section Title ────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 900,
      color: 'var(--text-secondary)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// ACCORDION CARD
// ══════════════════════════════════════════════════════
export function AccordionCard({
  title, icon, defaultOpen = false, badge, children
}: {
  title: string
  icon: string
  defaultOpen?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: open ? 'rgba(59,126,246,0.04)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</span>
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--accent-blue-light)',
              background: 'var(--accent-blue-dim)',
              border: '1px solid rgba(59,126,246,0.2)',
              padding: '2px 8px', borderRadius: 100,
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease',
          display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      )}
    </div>
  )
}
