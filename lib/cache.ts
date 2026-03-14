/**
 * Cache utilities — single source of truth
 * يمسح كل cache المستخدم بعد أي تعديل على البيانات
 */

const CACHE_KEYS = ['dashboard', 'tx', 'debts', 'goals', 'inv'] as const

export function clearUserCache(userId: string): void {
  if (!userId) return
  try {
    CACHE_KEYS.forEach(k => sessionStorage.removeItem(`${k}_${userId}`))
  } catch {}
}

export function clearCacheKey(key: typeof CACHE_KEYS[number], userId: string): void {
  if (!userId) return
  try {
    sessionStorage.removeItem(`${key}_${userId}`)
  } catch {}
}
