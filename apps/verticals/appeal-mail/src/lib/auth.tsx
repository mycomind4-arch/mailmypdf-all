import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
   MailMyPDF Account — Authentication Context
   ═══════════════════════════════════════════════════════════

   Canonical identity layer for Appeal Mail.
   Users authenticate with a MailMyPDF Account — one identity
   across all MailMyPDF products.

   Uses Supabase Auth as the identity provider.
   ═══════════════════════════════════════════════════════════ */

export interface MailMyPDFUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
}

export type UserRole = "customer" | "admin" | "super_admin";

interface AuthResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: MailMyPDFUser | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithMagicLink: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (data: { fullName?: string }) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type SupabaseClient = {
  auth: {
    getSession: () => Promise<{ data: { session: SupabaseSession | null }; error: unknown }>;
    getUser: () => Promise<{ data: { user: SupabaseAuthUser | null }; error: unknown }>;
    onAuthStateChange: (cb: (event: string, session: SupabaseSession | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
    signUp: (args: { email: string; password: string; options?: { emailRedirectTo?: string } }) => Promise<{ data: { session: SupabaseSession | null }; error: { message: string } | null }>;
    signInWithPassword: (args: { email: string; password: string }) => Promise<{ data: { session: SupabaseSession | null }; error: { message: string } | null }>;
    signInWithOtp: (args: { email: string; options?: { emailRedirectTo?: string } }) => Promise<{ data: unknown; error: { message: string } | null }>;
    resetPasswordForEmail: (email: string, opts?: { redirectTo?: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
    signOut: () => Promise<void>;
    updateUser: (data: { data?: Record<string, unknown> }) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

interface SupabaseSession { user?: SupabaseAuthUser; access_token?: string }
interface SupabaseAuthUser {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; role?: string; is_admin?: boolean };
}

async function loadSupabase(): Promise<SupabaseClient | null> {
  const url = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL;
  const anonKey = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, anonKey) as SupabaseClient;
  } catch {
    return null;
  }
}

function mapUser(supabaseUser: SupabaseAuthUser): MailMyPDFUser {
  const meta = supabaseUser.user_metadata || {};
  let role: UserRole = "customer";
  if (meta.role === "super_admin" || meta.role === "admin") role = meta.role;
  else if (meta.is_admin === true) role = "admin";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    fullName: meta.full_name,
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MailMyPDFUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let listener: { unsubscribe: () => void } | null = null;
    loadSupabase().then((client) => {
      if (!client) { setLoading(false); setIsConfigured(false); return; }
      setIsConfigured(true);

      client.auth.getSession().then(({ data }) => {
        if (data.session?.user) setUser(mapUser(data.session.user));
        setLoading(false);
      }).catch(() => setLoading(false));

      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) setUser(mapUser(session.user));
        else setUser(null);
        setLoading(false);
      });
      listener = data.subscription;
    });

    return () => { listener?.unsubscribe(); };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const client = await loadSupabase();
    if (!client) return { error: "MailMyPDF Account is not yet configured." };
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    if (error) return { error: error.message };
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const client = await loadSupabase();
    if (!client) return { error: "MailMyPDF Account is not yet configured." };
    const { error } = await client.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    const client = await loadSupabase();
    if (!client) return { error: "MailMyPDF Account is not yet configured." };
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    return { error: error?.message ?? null };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const client = await loadSupabase();
    if (!client) return { error: "MailMyPDF Account is not yet configured." };
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?mode=reset` });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const client = await loadSupabase();
    if (!client) return;
    await client.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { fullName?: string }): Promise<AuthResult> => {
    const client = await loadSupabase();
    if (!client) return { error: "MailMyPDF Account is not yet configured." };
    const { error } = await client.auth.updateUser({ data: { full_name: data.fullName } });
    if (error) return { error: error.message };
    setUser((prev) => prev ? { ...prev, fullName: data.fullName } : prev);
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isConfigured, signUp, signIn, signInWithMagicLink, resetPassword, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
