'use client'
import { useEffect, useState } from 'react'

export function AndroidBatteryTip() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent)
    const dismissed = localStorage.getItem('battery_tip_dismissed')
    if (isAndroid && !dismissed) setShow(true)
  }, [])

  if (!show) return null

  return (
    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: '14px 16px', marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#F59E0B' }}>⚡ تحسين استقبال الإشعارات</div>
        <button onClick={() => { localStorage.setItem('battery_tip_dismissed', '1'); setShow(false) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>
        لضمان وصول الإشعارات حتى عند إغلاق الشاشة، افتح إعدادات البطارية وحدد &quot;غير محدود&quot; لتطبيق Chrome
      </div>
      <button
        onClick={() => {
          window.location.href = 'intent:#Intent;action=android.settings.APP_DETAIL_SETTINGS;package=com.android.chrome;end'
        }}
        style={{ width: '100%', padding: '10px', borderRadius: 12, background: '#F59E0B', border: 'none', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
      >
        ⚙️ فتح إعدادات Chrome
      </button>
    </div>
  )
}
