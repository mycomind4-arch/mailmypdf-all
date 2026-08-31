import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "customer" | "admin" | "super_admin";

interface MailMyPDFUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
}

interface AuthContextType {
  user: MailMyPDFUser | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (data: { fullName?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(user: User): MailMyPDFUser {
  const meta = user.user_metadata || {};
  const role: UserRole = meta.role === "super_admin" || meta.role === "admin" || meta.is_admin === true
    ? (meta.role === "super_admin" ? "super_admin" : "admin")
    : "customer";
  return { id: user.id, email: user.email || "", fullName: meta.full_name, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MailMyPDFUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setIsConfigured(!error || !!data.session);
      const nextSession = data.session;
      setSession(nextSession);
      setUser(nextSession?.user ? mapUser(nextSession.user) : null);
      setAccessToken(nextSession?.access_token ?? null);
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ? mapUser(nextSession.user) : null);
      setAccessToken(nextSession?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user ? mapUser(data.session.user) : null);
      setAccessToken(data.session.access_token);
    }
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) return { error: error.message };
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user ? mapUser(data.session.user) : null);
      setAccessToken(data.session.access_token);
    }
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    return { error: error?.message ?? null };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?mode=reset` });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAccessToken(null);
    return { error: error?.message ?? null };
  }, []);

  const updateProfile = useCallback(async (data: { fullName?: string }) => {
    const { error } = await supabase.auth.updateUser({ data: { full_name: data.fullName } });
    if (error) return { error: error.message };
    setUser((prev) => prev ? { ...prev, fullName: data.fullName } : prev);
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, accessToken, loading, isConfigured, signIn, signUp, signInWithMagicLink, resetPassword, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
