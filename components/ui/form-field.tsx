'use client'
interface FormFieldProps {
  label: string
  children: React.ReactNode
}
export function FormField({ label, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function Input(props: InputProps) {
  return (
    <input {...props} className="input-field" style={{
      padding: '11px 14px', fontSize: 14, borderRadius: 10,
      ...props.style,
    }} />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
export function Select({ children, ...props }: SelectProps) {
  return (
    <select {...props} className="input-field" style={{
      padding: '11px 14px', fontSize: 14, borderRadius: 10,
      ...props.style,
    }}>
      {children}
    </select>
  )
}

interface SaveButtonProps { label: string; loading?: boolean; onClick: () => void }
export function SaveButton({ label, loading, onClick }: SaveButtonProps) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: '100%', padding: '14px', borderRadius: 12, marginTop: 6,
      background: loading ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
      color: 'white', fontSize: 14, fontWeight: 800,
      border: 'none', cursor: loading ? 'wait' : 'pointer',
      fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
      boxShadow: loading ? 'none' : '0 4px 20px var(--accent-blue-glow)',
      transition: 'all 0.2s',
    }}>
      {loading ? '⏳ جاري الحفظ...' : label}
    </button>
  )
}
