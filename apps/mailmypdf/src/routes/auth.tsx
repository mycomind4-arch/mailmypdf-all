import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase, ensureSupabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const AUTH_TIMEOUT_MS = 15_000;

function getAuthClient() {
  const auth = supabase?.auth;
  if (!auth) throw new Error("Account services are not configured. Please try again later or contact support.");
  return auth;
}

async function withAuthTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<T>((_, reject) => { timeoutId = setTimeout(() => reject(new Error("Account service timed out. Please check your connection and try again.")), AUTH_TIMEOUT_MS); })]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : typeof (s as any).returnTo === "string" ? (s as any).returnTo : "/dashboard" }),
  head: () => ({ meta: [{ title: "Sign in — MailMyPDF" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

type Tab = "signin" | "signup" | "reset";

function AuthPage() {
  const { redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { void ensureSupabase(); }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try { const auth = getAuthClient(); const { error } = await withAuthTimeout(auth.signInWithPassword({ email, password })); if (error) { setError(error.message); return; } await navigate({ to: redirect as "/dashboard" }); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null); setInfo(null);
    try { const auth = getAuthClient(); const { data, error } = await withAuthTimeout(auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/confirm?redirect=${encodeURIComponent(redirect)}` } })); if (error) { setError(error.message); return; } if (data.session) await navigate({ to: redirect as "/dashboard" }); else setInfo("Check your email for a confirmation link to complete sign-up."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to create your account. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null); setInfo(null);
    try { const auth = getAuthClient(); const { error } = await withAuthTimeout(auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirect)}` })); if (error) { setError(error.message); return; } setInfo("Password reset link sent. Check your email."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to send the reset link. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-md px-6 py-20"><div className="postmark w-fit">Account</div><h1 className="mt-4 font-serif text-4xl">{tab === "signin" ? "Welcome back" : tab === "signup" ? "Create your account" : "Reset password"}</h1>
      {tab !== "reset" && <div className="mt-6 flex gap-1 border-b border-rule"><TabButton active={tab === "signin"} onClick={() => { setTab("signin"); setError(null); }}>Sign in</TabButton><TabButton active={tab === "signup"} onClick={() => { setTab("signup"); setError(null); }}>Sign up</TabButton></div>}
      {tab === "signin" && <form onSubmit={handleSignIn} className="mt-8 space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} required /><Field label="Password" type="password" value={password} onChange={setPassword} required />{error && <div className="text-sm text-red-700">{error}</div>}<div className="flex items-center justify-between"><button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Working…" : "Sign in"}</button><button type="button" onClick={() => { setTab("reset"); setError(null); setInfo(null); }} className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</button></div></form>}
      {tab === "signup" && <form onSubmit={handleSignUp} className="mt-8 space-y-4"><Field label="Full name" type="text" value={fullName} onChange={setFullName} required /><Field label="Email" type="email" value={email} onChange={setEmail} required /><Field label="Password" type="password" value={password} onChange={setPassword} required /><p className="text-xs text-muted-foreground">Use at least 8 characters.</p>{error && <div className="text-sm text-red-700">{error}</div>}{info && <div className="text-sm text-emerald-700">{info}</div>}<button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Creating…" : "Create account"}</button><p className="text-xs text-muted-foreground">By signing up, you can track all your letters in one place and reorder with a click.</p></form>}
      {tab === "reset" && <form onSubmit={handleReset} className="mt-8 space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} required />{error && <div className="text-sm text-red-700">{error}</div>}{info && <div className="text-sm text-emerald-700">{info}</div>}<div className="flex items-center gap-4"><button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button><button type="button" onClick={() => { setTab("signin"); setError(null); setInfo(null); }} className="text-xs text-muted-foreground hover:text-foreground">← Back to sign in</button></div></form>}
      <p className="mt-8 text-xs text-muted-foreground">Staff accounts: <button onClick={() => setTab("signin")} className="underline">sign in here</button>. Need help? Email <a href="mailto:help@mailmypdf.ai" className="underline">help@mailmypdf.ai</a>.</p>
    </main><SiteFooter /></div>
  );
}
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${active ? "border-b-2 border-cobalt text-cobalt" : "text-muted-foreground hover:text-foreground"}`}>{children}</button>; }
function Field({ label, type, value, onChange, required }: { label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean }) { return <div><label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</label><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm" /></div>; }
