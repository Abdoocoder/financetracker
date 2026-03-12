'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>حدث خطأ غير متوقع</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>{this.state.message}</div>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.reload() }}
            style={{ padding: '12px 28px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🔄 إعادة المحاولة
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
