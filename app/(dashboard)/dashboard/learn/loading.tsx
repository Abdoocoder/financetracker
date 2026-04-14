export default function LearnLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 72, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
    </div>
  )
}
