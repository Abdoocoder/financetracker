'use client'
import { useI18n } from '@/lib/i18n'
import { usePush } from '@/lib/use-push'
import { toast } from '@/components/ui/toast'

export function PushToggle() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePush()

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

  return (
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
  )
}
