'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/components/ui/toast'
import { useI18n } from '@/lib/i18n'
import { usePullToRefresh } from '@/lib/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { PageHeader } from '@/components/ui/page-header'

const ALERT_CONFIG: Record<string, { icon: string; accent: string; bg: string; border: string }> = {
  warning:     { icon: '⚠️', accent: '#F87171', bg: 'rgba(239,68,68,0.06)',    border: 'rgba(239,68,68,0.2)'   },
  motivation:  { icon: '💪', accent: '#60A5FA', bg: 'rgba(59,130,246,0.06)',   border: 'rgba(59,130,246,0.2)'  },
  reminder:    { icon: '⏰', accent: '#FCD34D', bg: 'rgba(245,158,11,0.06)',   border: 'rgba(245,158,11,0.2)'  },
  achievement: { icon: '🏆', accent: '#34D399', bg: 'rgba(16,185,129,0.06)',   border: 'rgba(16,185,129,0.2)'  },
}

function AlertCard({ alert, onRead, onDelete }: { alert: any; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  const cfg = ALERT_CONFIG[alert.type] ?? { icon: '🔔', accent: '#8B9CC8', bg: 'rgba(139,156,200,0.06)', border: 'rgba(139,156,200,0.2)' }
  const [deleting, setDeleting] = useState(false)

  const date = new Date(alert.created_at).toLocaleDateString('ar-JO', {
    weekday: 'short', month: 'short', day: 'numeric'
  })

  return (
    <div
      onClick={() => !alert.is_read && onRead(alert.id)}
      style={{
        background: alert.is_read ? 'var(--bg-card)' : cfg.bg,
        border: `1px solid ${alert.is_read ? 'var(--border)' : cfg.border}`,
        borderRadius: 16,
        padding: '16px',
        cursor: !alert.is_read ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}>
      {/* Accent Bar */}
      {!alert.is_read && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: 3, background: cfg.accent,
          borderRadius: '0 16px 16px 0',
          boxShadow: `0 0 12px ${cfg.accent}`,
        }} />
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: alert.is_read ? 'var(--bg-secondary)' : `${cfg.accent}18`,
          border: `1px solid ${alert.is_read ? 'var(--border)' : `${cfg.accent}30`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>{cfg.icon}</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 14, fontWeight: 800,
              color: alert.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
            }}>{alert.title}</span>
            {!alert.is_read && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: cfg.accent, boxShadow: `0 0 8px ${cfg.accent}`,
                display: 'inline-block',
              }} />
            )}
          </div>
          <p style={{
            fontSize: 13, lineHeight: 1.6,
            color: alert.is_read ? 'var(--text-muted)' : 'var(--text-secondary)',
            margin: 0,
          }}>{alert.message}</p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
            {date}
          </span>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); setDeleting(true); onDelete(alert.id) }}
          disabled={deleting}
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
            color: '#F87171', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: deleting ? 0.4 : 1, transition: 'opacity 0.15s',
          }}>✕</button>
      </div>
    </div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'warning' | 'achievement'>('all')
  const supabase = createClient()
  const { t } = useI18n()
  const { el: pageRef, refreshing } = usePullToRefresh(async () => { await load() })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('alerts').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setAlerts(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function generateNow() {
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { toast.error('يجب تسجيل الدخول'); setGenerating(false); return }
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error ?? 'حدث خطأ')
      else {
        toast.success(data.message)
        await load()
      }
    } catch { toast.error('خطأ في الاتصال') }
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
    toast.success(t('toast_marked_read'))
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
    toast.success(t('toast_all_deleted'))
  }

  const unreadCount = alerts.filter(a => !a.is_read).length
  const filtered = alerts.filter(a => {
    if (filter === 'unread')      return !a.is_read
    if (filter === 'warning')     return a.type === 'warning'
    if (filter === 'achievement') return a.type === 'achievement'
    return true
  })

  const filterTabs = [
    { key: 'all',         label: `الكل (${alerts.length})` },
    { key: 'unread',      label: `غير مقروء (${unreadCount})` },
    { key: 'warning',     label: '⚠️ تحذيرات' },
    { key: 'achievement', label: '🏆 إنجازات' },
  ]

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
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{t('alerts_title')}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{alerts.length} تنبيه</span>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold badge-red">
                {unreadCount} غير مقروء
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-3 py-2 rounded-xl text-xs font-bold badge-blue"
              style={{ fontFamily: 'inherit' }}>
              {t('alerts_mark_all')}
            </button>
          )}
          {alerts.length > 0 && (
            <button onClick={deleteAll}
              className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', fontFamily: 'inherit' }}>
              {t('alerts_delete_all')}
            </button>
          )}
        </div>
      </div>

      {/* Generate Card */}
      <div className="card p-4" style={{ background: 'linear-gradient(135deg, rgba(59,126,246,0.08) 0%, rgba(139,92,246,0.08) 100%)', borderColor: 'rgba(59,126,246,0.2)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #3B7EF6, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 16px rgba(59,126,246,0.4)',
          }}>🤖</div>
          <div>
            <div className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{t('alerts_bot_title')}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('alerts_bot_sub')}</div>
          </div>
        </div>
        <button onClick={generateNow} disabled={generating}
          className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-50 transition-all"
          style={{ background: generating ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #3B7EF6 0%, #8B5CF6 100%)', fontFamily: 'inherit', boxShadow: generating ? 'none' : '0 4px 20px rgba(59,126,246,0.35)' }}>
          {generating ? '⏳ جاري التحليل...' : `✨ ${t('alerts_generate')}`}
        </button>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>{t('alerts_auto')}</p>
      </div>

      {/* Filter Tabs */}
      {alerts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {filterTabs.map(tab => (
            <button key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: filter === tab.key ? 'var(--accent-blue)' : 'var(--bg-card)',
                color: filter === tab.key ? 'white' : 'var(--text-muted)',
                border: `1px solid ${filter === tab.key ? 'transparent' : 'var(--border)'}`,
                fontFamily: 'inherit',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2">
        {filtered.map(alert => (
          <AlertCard key={alert.id} alert={alert} onRead={markRead} onDelete={deleteAlert} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 card">
            <div className="text-5xl mb-4">🔔</div>
            <div className="font-black text-lg" style={{ color: 'var(--text-secondary)' }}>{t('alerts_empty')}</div>
            <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{t('alerts_empty_sub')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
