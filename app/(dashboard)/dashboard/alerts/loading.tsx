export default function AlertsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 56, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 92, borderRadius: 16 }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
      ))}
    </div>
  )
}
