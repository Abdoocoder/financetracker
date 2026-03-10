'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const supabase = createClient()
  const { success, error } = useToast()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setAlerts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function generateNow() {
    setGenerating(true)
    setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        error('يجب تسجيل الدخول أولاً')
        setGenerating(false)
        return
      }
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) {
        error(data.error ?? 'حدث خطأ')
      } else {
        success(data.message ?? '✅ تم توليد التنبيهات')
        await load()
      }
    } catch (err: any) {
      error(`خطأ في الاتصال`)
    }
    setGenerating(false)
  }

  async function markRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    success('تم تعيين الكل كمقروء')
  }

  async function deleteAlert(id: string) {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  async function deleteAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').delete().eq('user_id', user.id)
    setAlerts([])
    success('تم حذف كل التنبيهات')
  }

  const unread = alerts.filter(a => !a.is_read).length

  const cfg: Record<string, { icon: string; bg: string; border: string }> = {
    warning:     { icon: '⚠️', bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.25)'   },
    motivation:  { icon: '💪', bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.25)'  },
    reminder:    { icon: '⏰', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.25)'  },
    achievement: { icon: '🏆', bg: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.25)'  },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-3xl animate-pulse-slow">⏳</div>
    </div>
  )

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl lg:max-w-none mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>التنبيهات</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{alerts.length} تنبيه</span>
            {unread > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold badge-red">{unread} غير مقروء</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead}
              className="px-3 py-2 rounded-xl text-xs font-bold badge-blue"
              style={{ fontFamily: 'inherit' }}>
              قراءة الكل
            </button>
          )}
          {alerts.length > 0 && (
            <button onClick={deleteAll}
              className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red-light)', fontFamily: 'inherit' }}>
              حذف الكل
            </button>
          )}
        </div>
      </div>

      {/* Generate Card */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center text-xl glow-blue shrink-0">🤖</div>
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>توليد تنبيهات ذكية</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>تحليل وضعك المالي وإنشاء توصيات مخصصة</div>
          </div>
        </div>
        <button onClick={generateNow} disabled={generating}
          className="w-full py-3 rounded-xl gradient-blue text-white font-black text-sm disabled:opacity-50 transition-all"
          style={{ fontFamily: 'inherit' }}>
          {generating ? '⏳ جاري التحليل...' : '✨ توليد تنبيهات الآن'}
        </button>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          يعمل تلقائياً كل يوم الساعة 7:00 صباحاً
        </p>
      </div>

      {/* Alerts List */}
      <div className="space-y-2">
        {alerts.map((alert) => {
          const c = cfg[alert.type] ?? { icon: '🔔', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' }
          return (
            <div key={alert.id} className="card p-4 transition-all"
              style={{
                background: !alert.is_read ? c.bg : undefined,
                borderColor: !alert.is_read ? c.border : undefined,
              }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{c.icon}</span>
                <div className="flex-1 min-w-0"
                  onClick={() => !alert.is_read && markRead(alert.id)}
                  style={{ cursor: !alert.is_read ? 'pointer' : 'default' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      {alert.title}
                    </span>
                    {!alert.is_read && (
                      <span className="w-2 h-2 rounded-full shrink-0 inline-block"
                        style={{ background: 'var(--accent-blue)' }} />
                    )}
                  </div>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {alert.message}
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {new Date(alert.created_at).toLocaleDateString('ar-JO', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <button onClick={() => deleteAlert(alert.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5"
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
