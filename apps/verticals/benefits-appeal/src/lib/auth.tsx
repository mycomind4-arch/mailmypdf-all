import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { AuthContext, mapUser, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY))

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ? mapUser(data.session.user) : null)
      setAccessToken(data.session?.access_token ?? null)
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ? mapUser(nextSession.user) : null)
      setAccessToken(nextSession?.access_token ?? null)
      setLoading(false)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => ({ error: (await supabase.auth.signInWithPassword({ email, password })).error?.message ?? null }), [])
  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
    return { error: error?.message ?? null, needsConfirmation: !data.session }
  }, [])
  const resetPassword = useCallback(async (email: string) => ({ error: (await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` })).error?.message ?? null }), [])
  const signOut = useCallback(async () => ({ error: (await supabase.auth.signOut()).error?.message ?? null }), [])

  return <AuthContext.Provider value={{ user, session, accessToken, loading, isConfigured, signIn, signUp, resetPassword, signOut }}>{children}</AuthContext.Provider>
}
