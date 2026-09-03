import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface BenefitsUser { id: string; email: string; fullName?: string }
export interface AuthContextValue {
  user: BenefitsUser | null
  session: Session | null
  accessToken: string | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<{ error: string | null }>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
export const mapUser = (user: User): BenefitsUser => ({ id: user.id, email: user.email || '', fullName: user.user_metadata?.full_name })
