import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AccountUser { id: string; email: string; fullName?: string; role?: string }
interface AccountContext {
  user: AccountUser | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const Context = createContext<AccountContext | undefined>(undefined);
const KEY = "mailmypdf_business_auth";

type StoredSession = { access_token: string; refresh_token: string; expires_at?: number; user: AccountUser };

async function authRequest(path: string, body: unknown) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("MailMyPDF Account is not configured.");
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/${path}`, { method: "POST", headers: { apikey: anon, "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || "Authentication failed.");
  return payload as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> }; session?: { access_token: string; refresh_token: string; expires_in?: number }; };
}

function normalize(payload: { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } }): StoredSession {
  const raw = payload.user || { id: "", email: "" };
  const meta = raw.user_metadata || {};
  return { access_token: payload.access_token, refresh_token: payload.refresh_token, expires_at: Date.now() + (payload.expires_in ?? 3600) * 1000, user: { id: raw.id, email: raw.email || "", fullName: typeof meta.full_name === "string" ? meta.full_name : undefined, role: typeof meta.role === "string" ? meta.role : "customer" } };
}

export function BusinessAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as StoredSession : null; } catch { return null; } });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      if (!session?.refresh_token || !session.expires_at || session.expires_at - Date.now() > 60_000) return;
      try {
        const payload = await authRequest("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
        if (payload.access_token && payload.refresh_token && payload.user) {
          const next = normalize(payload as { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } });
          setSession(next); localStorage.setItem(KEY, JSON.stringify(next));
        }
      } catch {
        setSession(null); localStorage.removeItem(KEY);
      }
    };
    void refresh();
  }, [session]);

  const value = useMemo<AccountContext>(() => ({
    user: session?.user || null,
    accessToken: session?.access_token || null,
    loading,
    signIn: async (email, password) => {
      setLoading(true);
      try {
        const payload = await authRequest("token?grant_type=password", { email, password });
        if (!payload.access_token || !payload.refresh_token || !payload.user) return "Authentication failed.";
        const next = normalize(payload as { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } });
        setSession(next); localStorage.setItem(KEY, JSON.stringify(next)); return null;
      } catch (error) { return error instanceof Error ? error.message : "Authentication failed."; }
      finally { setLoading(false); }
    },
    signUp: async (email, password) => {
      setLoading(true);
      try {
        const payload = await authRequest("signup", { email, password, options: { email_redirect_to: window.location.origin } });
        if (payload.access_token && payload.refresh_token && payload.user) { const next = normalize(payload as { access_token: string; refresh_token: string; expires_in?: number; user?: { id: string; email?: string; user_metadata?: Record<string, unknown> } }); setSession(next); localStorage.setItem(KEY, JSON.stringify(next)); return { error: null, needsConfirmation: false }; }
        return { error: null, needsConfirmation: true };
      } catch (error) { return { error: error instanceof Error ? error.message : "Account creation failed.", needsConfirmation: false }; }
      finally { setLoading(false); }
    },
    signOut: async () => {
      const token = session?.access_token;
      if (token) { try { const url = import.meta.env.VITE_SUPABASE_URL; const anon = import.meta.env.VITE_SUPABASE_ANON_KEY; await fetch(`${url.replace(/\/$/, "")}/auth/v1/logout`, { method: "POST", headers: { apikey: anon, authorization: `Bearer ${token}` } }); } catch { /* local logout still succeeds */ } }
      setSession(null); localStorage.removeItem(KEY);
    },
  }), [session, loading]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBusinessAccount() { const ctx = useContext(Context); if (!ctx) throw new Error("useBusinessAccount must be used within BusinessAccountProvider"); return ctx; }

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, signIn, signUp, signOut, loading } = useBusinessAccount();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(null); setNotice(null); const result = mode === "signin" ? { error: await signIn(email, password), needsConfirmation: false } : await signUp(email, password); if (result.error) setError(result.error); else if (result.needsConfirmation) setNotice("Check your email to confirm your account."); else onClose(); };
  if (user) return <div className="overlay"><div className="composer" style={{ maxWidth: 480 }}><div className="composer-head"><div><div className="eyebrow">MailMyPDF Account</div><h2 className="serif">{user.email}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div><p>Business workspace access is tied to your MailMyPDF Account.</p><div className="composer-actions"><button className="secondary" onClick={() => void signOut()}>Sign out</button><button className="primary" onClick={onClose}>Done</button></div></div></div>;
  return <div className="overlay"><div className="composer" style={{ maxWidth: 480 }}><div className="composer-head"><div><div className="eyebrow">MailMyPDF Account</div><h2 className="serif">{mode === "signin" ? "Welcome back." : "Create your account."}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>{error && <div className="error-box">{error}</div>}{notice && <div className="composer-preview"><strong>{notice}</strong></div>}<form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label><div className="composer-actions"><button type="button" className="secondary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Create account" : "Sign in"}</button><button type="submit" className="primary" disabled={loading}>{loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}</button></div></form></div></div>;
}
