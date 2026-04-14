export default function SettingsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 64, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 20 }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 20 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
    </div>
  )
}
