'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useToast } from '@/lib/toast-context'

export default function AlertsPage() {
  const { user } = useUser()
  const supabase = createClient()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { showToast } = useToast()

  const loadAlerts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setAlerts(data ?? [])
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadAlerts() }, [loadAlerts])

  async function generateAlerts() {
    setGenerating(true)
    try {
      const res = await fetch('/api/alerts', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'حدث خطأ')
      showToast('✅ تم توليد التنبيهات بنجاح', 'success')
      await loadAlerts()
    } catch (err: any) {
      showToast('❌ ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function markAsRead(id: string) {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  async function markAllRead() {
    if (!user) return
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', user.id)
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
  }

  async function deleteAlert(id: string) {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const unreadCount = alerts.filter(a => !a.is_read).length
  const typeIcon: Record<string, string> = {
    warning: '⚠️',
    motivation: '💪',
    reminder: '⏰',
    achievement: '🏆',
  }

  if (loading) return <div className="text-center p-8">جاري التحميل...</div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-4 text-white" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">التنبيهات</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-400 mt-1">{unreadCount} غير مقروء</p>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-800 text-sm"
            >
              قراءة الكل
            </button>
          )}
          <button
            onClick={generateAlerts}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-green-600/20 text-green-400 border border-green-800 text-sm disabled:opacity-50"
          >
            {generating ? '⏳ جاري...' : '✨ توليد جديد'}
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-xl font-bold mb-2">لا توجد تنبيهات</h3>
          <p className="text-gray-400 mb-4">اضغط على "توليد جديد" لإنشاء تنبيهات مخصصة لك</p>
          <button
            onClick={generateAlerts}
            disabled={generating}
            className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold"
          >
            {generating ? '⏳ جاري...' : '✨ توليد تنبيهات الآن'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-gray-900 rounded-xl p-4 border transition-all ${
                !alert.is_read ? 'border-blue-500/50' : 'border-gray-800'
              }`}
              onClick={() => !alert.is_read && markAsRead(alert.id)}
              style={{ cursor: !alert.is_read ? 'pointer' : 'default' }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcon[alert.type] || '🔔'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{alert.title}</h3>
                    {!alert.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="text-gray-300 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.created_at).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
