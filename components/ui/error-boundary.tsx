'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: '32px 20px', textAlign: 'center',
          background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 20, margin: '20px 0',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            حدث خطأ غير متوقع
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '10px 24px', borderRadius: 12,
              background: 'var(--accent-blue)', color: 'white',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
