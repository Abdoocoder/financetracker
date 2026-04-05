'use client'
import { useState } from 'react'
import { AndroidBatteryTip } from '@/components/ui/android-battery-tip'
import { usePush } from '@/lib/use-push'
import { toast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

export function PushToggle() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePush()
  const [testing, setTesting] = useState(false)

  if (!supported) return (
    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
      المتصفح لا يدعم الإشعارات
    </div>
  )

  async function handleToggle() {
    if (subscribed) {
      await unsubscribe()
      toast.success('Notifications disabled')
    } else {
      const result = await subscribe()
      if (result?.ok) toast.success('✅ Notifications enabled!')
      else if (result?.reason === 'permission_denied') toast.error('❌ Allow notifications in browser settings')
      else toast.error('Error — please try again')
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('يجب تسجيل الدخول أولاً'); return }

      const res = await fetch('/api/push-test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const json = await res.json()

      if (json.sent > 0) {
        toast.success('✅ تم الإرسال! تحقق من إشعاراتك')
      } else {
        toast.error('❌ لم يُرسَل — تأكد أن الإشعارات مفعّلة وأن الاشتراك محفوظ')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <div className="card p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: subscribed ? 'rgba(16,185,129,0.12)' : 'rgba(59,126,246,0.12)',
            border: `1px solid ${subscribed ? 'rgba(16,185,129,0.2)' : 'rgba(59,126,246,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
          }}>🔔</div>
          <div>
            <div className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
              إشعارات الهاتف
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {subscribed ? '✅ مفعّلة — ستصلك تنبيهات يومياً' : 'تلقّ تنبيهات حتى لو التطبيق مغلق'}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            width: 52, height: 28, borderRadius: 14,
            background: subscribed ? '#10B981' : 'var(--bg-secondary)',
            border: `1px solid ${subscribed ? '#10B981' : 'var(--border)'}`,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.3s', position: 'relative',
            opacity: loading ? 0.6 : 1,
          }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'white',
            position: 'absolute', top: 3,
            right: subscribed ? 4 : 28,
            transition: 'right 0.3s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>

      {/* زر الاختبار — يظهر فقط عندما الإشعارات مفعّلة */}
      {subscribed && (
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 12,
            background: testing ? 'var(--bg-secondary)' : 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: testing ? 'var(--text-muted)' : '#F59E0B',
            fontSize: 13, fontWeight: 700, cursor: testing ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
          {testing ? '⏳ جاري الإرسال...' : '🧪 إرسال إشعار تجريبي'}
        </button>
      )}

      <AndroidBatteryTip />
    </>
  )
}
