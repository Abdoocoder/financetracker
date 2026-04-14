export default function PdfReportLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 84, borderRadius: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div className="skeleton" style={{ height: 96, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 12 }} />
      </div>
      <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
    </div>
  )
}
