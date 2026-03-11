'use client'
interface FormFieldProps {
  label: string
  children: React.ReactNode
  error?: string
}
export function FormField({ label, children, error }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: error ? 'var(--accent-red-light)' : 'var(--text-muted)',
        marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase',
        transition: 'color 0.2s',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{
          fontSize: 11, color: 'var(--accent-red-light)',
          marginTop: 5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
          animation: 'slideDown 0.2s ease',
        }}>
          <span style={{ fontSize: 10 }}>⚠</span> {error}
        </div>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}
export function Input({ error, ...props }: InputProps) {
  return (
    <input {...props} className="input-field" style={{
      padding: '11px 14px', fontSize: 14, borderRadius: 10,
      border: error ? '1px solid var(--accent-red) !important' : undefined,
      outline: error ? 'none' : undefined,
      boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.15)' : undefined,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      ...props.style,
    }} />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}
export function Select({ children, error, ...props }: SelectProps) {
  return (
    <select {...props} className="input-field" style={{
      padding: '11px 14px', fontSize: 14, borderRadius: 10,
      border: error ? '1px solid var(--accent-red) !important' : undefined,
      boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.15)' : undefined,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      ...props.style,
    }}>
      {children}
    </select>
  )
}

interface SaveButtonProps { label: string; loading?: boolean; onClick: () => void }
export function SaveButton({ label, loading, onClick }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 12, marginTop: 6,
        background: loading ? 'var(--bg-elevated)' : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
        color: 'white', fontSize: 14, fontWeight: 800,
        border: 'none', cursor: loading ? 'wait' : 'pointer',
        fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
        boxShadow: loading ? 'none' : '0 4px 20px var(--accent-blue-glow)',
        transition: 'all 0.2s',
        transform: 'scale(1)',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
      onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
    >
      {loading ? '⏳ جاري الحفظ...' : label}
    </button>
  )
}
