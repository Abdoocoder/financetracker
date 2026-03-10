'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePush() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    if (!('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    } catch {}
  }

  async function subscribe() {
    setLoading(true)
    try {
      // تسجيل Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // طلب الإذن
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setLoading(false)
        return { ok: false, reason: 'permission_denied' }
      }

      // الاشتراك
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      // حفظ في Supabase
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return { ok: false } }

      const subJson = sub.toJSON()
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(subJson)
      })

      setSubscribed(true)
      setLoading(false)
      return { ok: true }
    } catch (err: any) {
      setLoading(false)
      return { ok: false, reason: err.message }
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await fetch('/api/push-subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ endpoint: sub.endpoint })
          })
        }
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {}
    setLoading(false)
  }

  return { supported, subscribed, loading, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}
