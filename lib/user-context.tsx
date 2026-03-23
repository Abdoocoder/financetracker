'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Profile } from '@/types'

interface UserContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({ user: null, profile: null, loading: true })

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile(userId: string) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
    }

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await fetchProfile(user.id)
      }
      setLoading(false)
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        await fetchProfile(newUser.id)
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <UserContext.Provider value={{ user, profile, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
