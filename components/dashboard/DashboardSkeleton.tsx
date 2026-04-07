'use client'

function Bone({ w, h = '14px', r = '8px' }: { w: string; h?: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />
}

export function DashSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Bone w="140px" h="24px" /><Bone w="80px" h="18px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="card-static" style={{ padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Bone w="32px" h="32px" r="10px" /><Bone w="60px" h="20px" r="6px" /><Bone w="50px" h="12px" r="6px" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="card-static" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Bone w="48px" h="48px" r="14px" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone w="80px" h="12px" r="6px" /><Bone w="120px" h="20px" r="6px" />
          </div>
          <Bone w="20px" h="20px" r="6px" />
        </div>
      ))}
    </div>
  )
}
