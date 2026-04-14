export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 56, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 92, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 128, borderRadius: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div className="skeleton" style={{ height: 74, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 74, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 74, borderRadius: 14 }} />
      </div>
      <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
    </div>
  )
}
