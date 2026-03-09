'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

export function useCachedData<T>(key: string, fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data)
      setLoading(false)
      return
    }
    try {
      const result = await fetcherRef.current()
      cache.set(key, { data: result, timestamp: Date.now() })
      setData(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [key])

  useEffect(() => {
    load()
  }, [load, ...deps])

  return { data, loading, error }
}
