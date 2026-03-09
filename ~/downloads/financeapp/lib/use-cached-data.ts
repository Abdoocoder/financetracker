'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 ثانية

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(() => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return null
  })
  const [loading, setLoading] = useState(!cache.get(key))
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async (force = false) => {
    const cached = cache.get(key)
    if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      cache.set(key, { data: result, timestamp: Date.now() })
      setData(result)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [key])

  useEffect(() => { load() }, [load, ...deps])

  const refresh = useCallback(() => {
    cache.delete(key)
    load(true)
  }, [key, load])

  const invalidate = useCallback(() => cache.delete(key), [key])

  return { data, loading, error, refresh, invalidate }
}

export function invalidateCache(key: string) {
  cache.delete(key)
}

export function invalidateAllCache() {
  cache.clear()
}
