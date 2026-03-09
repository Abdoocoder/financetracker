'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserContextType {
  user: User | null
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refresh: () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase, loadUser])

  return (
    <UserContext.Provider value={{ user, loading, refresh: loadUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
