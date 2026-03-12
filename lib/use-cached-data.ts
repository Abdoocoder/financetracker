'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<any>>()
const CACHE_TTL = 30_000 // 30 ثانية

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CACHE_TTL
) {
  const cached = memoryCache.get(key)
  const [data, setData] = useState<T | null>(cached?.data ?? null)
  const [loading, setLoading] = useState(!cached)
  const [refreshing, setRefreshing] = useState(false)
  const fetchedRef = useRef(false)

  const load = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const cached = memoryCache.get(key)
    
    // إذا في cache حديث وما في force refresh — اعرض فوراً
    if (cached && now - cached.timestamp < ttl && !forceRefresh) {
      setData(cached.data)
      setLoading(false)
      return
    }

    // إذا في cache قديم — اعرضه أولاً ثم حدّث في الخلفية (stale-while-revalidate)
    if (cached && !forceRefresh) {
      setData(cached.data)
      setLoading(false)
      setRefreshing(true)
    }

    try {
      const fresh = await fetcher()
      memoryCache.set(key, { data: fresh, timestamp: now })
      setData(fresh)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [key, fetcher, ttl])

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      load()
    }
  }, [load])

  const refresh = useCallback(() => load(true), [load])
  const invalidate = useCallback(() => {
    memoryCache.delete(key)
    fetchedRef.current = false
    load(true)
  }, [key, load])

  return { data, loading, refreshing, refresh, invalidate }
}

// مسح كل الـ cache عند logout
export function clearAllCache() {
  memoryCache.clear()
}
