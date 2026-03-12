import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile, Organization } from '@/types/database.types'

export interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  organization: Organization | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
