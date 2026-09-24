import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Profile, Organization } from '@/types/database.types'
import { AuthContext } from './hooks/use-auth'

/**
 * Google sign-in is for employees only, and only for people HR has already set up.
 *
 * Signing in with Google creates an auth user for any Google address, so without
 * this check a stranger could land on the company-setup screen. Alumni and
 * candidates keep their email and password.
 */
function mayUseGoogle(user: User, profile: Profile | null): boolean {
  if (user.app_metadata?.provider !== 'google') return true
  if (!profile?.organization_id) return false
  return profile.role !== 'candidate' && profile.role !== 'alumni'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchProfile = useCallback(async (userId: string, user?: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch profile:', error.message)
        setProfile(null)
        return
      }

      if (user && !mayUseGoogle(user, data as Profile | null)) {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        setProfile(null)
        setOrganization(null)
        toast.error('This Google account does not have access. Please ask HR to set up your login.')
        return
      }

      if (data) {
        setProfile(data as Profile)
        if (data.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', data.organization_id)
            .single()
          setOrganization(org as Organization | null)
        } else {
          setOrganization(null)
        }
      }
    } catch (err) {
      console.error('fetchProfile error:', err)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  // Arms a safety timeout that forces isLoading=false if anything hangs
  const armSafetyTimeout = useCallback((ms = 8000) => {
    clearTimeout(safetyTimerRef.current)
    safetyTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Auth safety timeout fired — forcing isLoading=false')
        setIsLoading(false)
      }
    }, ms)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    armSafetyTimeout(8000)

    // Listen for auth state changes — callback is NOT async to avoid hanging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mountedRef.current) return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          // Fetch profile without blocking — .finally guarantees isLoading=false
          fetchProfile(newSession.user.id, newSession.user).finally(() => {
            if (mountedRef.current) {
              setIsLoading(false)
              clearTimeout(safetyTimerRef.current)
            }
          })
        } else {
          setProfile(null)
          setOrganization(null)
          setIsLoading(false)
          clearTimeout(safetyTimerRef.current)
        }
      }
    )

    // Kick off initial session check — triggers onAuthStateChange with INITIAL_SESSION
    supabase.auth.getSession().catch((err) => {
      console.error('getSession error:', err)
      if (mountedRef.current) setIsLoading(false)
    })

    return () => {
      mountedRef.current = false
      clearTimeout(safetyTimerRef.current)
      subscription.unsubscribe()
    }
  }, [fetchProfile, armSafetyTimeout])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    armSafetyTimeout(10000) // Re-arm timeout for sign-in flow
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setIsLoading(false)
      clearTimeout(safetyTimerRef.current)
      throw error
    }
    // onAuthStateChange will handle setting session, profile, and isLoading=false
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Force clear even if signOut API fails (e.g. expired token)
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    setOrganization(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        organization,
        isLoading,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
