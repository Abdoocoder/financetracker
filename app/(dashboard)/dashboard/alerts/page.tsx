'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setAlerts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    load()
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id)
    load()
  }

  const unread = alerts.filter(a => !a.is_read).length
  const cfg: Record<string,{icon:string,cls:string}> = {
    warning: { icon: '⚠️', cls: 'badge-yellow' },
    motivation: { icon: '💪', cls: 'badge-green' },
    reminder: { icon: '⏰', cls: 'badge-blue' },
    achievement: { icon: '🏆', cls: 'badge-blue' },
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-3xl animate-pulse-slow">⏳</div></div>

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>التنبيهات</h1>
          {unread > 0 && <p className="text-xs mt-0.5 badge-red px-2 py-0.5 rounded-full inline-block">{unread} غير مقروء</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 rounded-xl text-sm font-bold badge-blue">قراءة الكل</button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const c = cfg[alert.type] ?? { icon: '🔔', cls: 'badge-blue' }
          return (
            <div key={alert.id} className={`card p-4 flex items-start gap-3 cursor-pointer transition-all ${!alert.is_read ? 'border-blue-500/30' : ''}`}
              onClick={() => !alert.is_read && markRead(alert.id)}
              style={{ borderColor: !alert.is_read ? 'rgba(59,130,246,0.3)' : undefined }}>
              <span className="text-2xl shrink-0">{c.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{alert.title}</span>
                  {!alert.is_read && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                </div>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{alert.message}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{new Date(alert.created_at).toLocaleDateString('ar-JO')}</p>
              </div>
            </div>
          )
        })}
        {alerts.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-4xl mb-3">🔔</div>
            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>لا توجد تنبيهات</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>ستصلك تنبيهات يومياً الساعة 7 صباحاً</div>
          </div>
        )}
      </div>
    </div>
  )
}
