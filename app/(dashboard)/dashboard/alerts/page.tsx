'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setAlerts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function generateNow() {
    setGenerating(true)
    setMsg('')
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer financetracker2026' }
      })
      const data = await res.json()
      setMsg(data.message ?? 'تم توليد التنبيهات')
      await load()
    } catch {
      setMsg('حدث خطأ، حاول مرة أخرى')
    }
    setGenerating(false)
  }

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

  async function deleteAlert(id: string) {
    await supabase.from('alerts').delete().eq('id', id)
    load()
  }

  const unread = alerts.filter(a => !a.is_read).length
  const cfg: Record<string, { icon: string }> = {
    warning: { icon: '⚠️' },
    motivation: { icon: '💪' },
    reminder: { icon: '⏰' },
    achievement: { icon: '🏆' },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-pulse-slow">⏳</div>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>التنبيهات</h1>
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full badge-red mt-0.5 inline-block">{unread} غير مقروء</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-3 py-2 rounded-xl text-xs font-bold badge-blue">قراءة الكل</button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>توليد تنبيهات ذكية</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>تحليل وضعك المالي وإنشاء توصيات</div>
          </div>
        </div>
        {msg && <div className="p-3 rounded-xl text-sm mb-3 badge-green">{msg}</div>}
        <button onClick={generateNow} disabled={generating}
          className="w-full py-3 rounded-xl gradient-blue text-white font-black text-sm disabled:opacity-50"
          style={{ fontFamily: 'inherit' }}>
          {generating ? '⏳ جاري التحليل...' : '✨ توليد تنبيهات الآن'}
        </button>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>يعمل تلقائياً كل يوم الساعة 7 صباحاً</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const c = cfg[alert.type] ?? { icon: '🔔' }
          return (
            <div key={alert.id} className="card p-4"
              style={{ borderColor: !alert.is_read ? 'rgba(59,130,246,0.3)' : undefined }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{c.icon}</span>
                <div className="flex-1 min-w-0" onClick={() => !alert.is_read && markRead(alert.id)}
                  style={{ cursor: !alert.is_read ? 'pointer' : 'default' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{alert.title}</span>
                    {!alert.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent-blue)' }} />}
                  </div>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{alert.message}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {new Date(alert.created_at).toLocaleDateString('ar-JO', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => deleteAlert(alert.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0"
                  style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red-light)' }}>✕</button>
              </div>
            </div>
          )
        })}
        {alerts.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-5xl mb-4">🔔</div>
            <div className="font-black text-lg" style={{ color: 'var(--text-secondary)' }}>لا توجد تنبيهات</div>
            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>اضغط الزر أعلاه لتحليل وضعك المالي</div>
          </div>
        )}
      </div>
    </div>
  )
}
