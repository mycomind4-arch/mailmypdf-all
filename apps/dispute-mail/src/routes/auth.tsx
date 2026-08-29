import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({ head: () => ({ meta: [{ title: "Sign In — Dispute Mail" }, { name: "robots", content: "noindex,nofollow" }] }), component: AuthPage });

function AuthPage() {
  const [signUp, setSignUp] = useState(false);
  const [magic, setMagic] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user, loading, signIn, signUp: createAccount, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/auth" }) as { returnTo?: string };
  useEffect(() => { if (!loading && user) navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" }); }, [loading, user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null);
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (!magic && !password.trim()) { setError("Enter your password."); return; }
    setBusy(true);
    try {
      if (magic) {
        const result = await signInWithMagicLink(email.trim());
        if (result.error) setError(result.error); else setNotice("Check your email for a secure sign-in link.");
      } else if (signUp) {
        const result = await createAccount(email.trim(), password);
        if (result.error) setError(result.error); else if (result.needsConfirmation) setNotice("Check your email to confirm the account before signing in."); else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) setError(result.error); else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Authentication failed."); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    setError(null); setNotice(null);
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setBusy(true); const result = await resetPassword(email.trim()); setBusy(false);
    if (result.error) setError(result.error); else setNotice("Password reset instructions have been sent if this account exists.");
  };

  return <main className="min-h-screen bg-cream"><SiteHeader /><section className="py-12 md:py-20"><div className="container max-w-4xl"><div className="grid overflow-hidden rounded-2xl border border-warm-border md:grid-cols-2"><div className="p-8 md:p-10" style={{ background: "linear-gradient(135deg, #2a2d3f 0%, #1a1d2e 100%)" }}><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15"><ShieldAlert size={18} className="text-stamp-soft" /></div><span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Dispute Mail</span></div><h1 className="mt-8 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Your disputes, organized and sent.</h1><p className="mt-4 text-sm leading-7 text-white/60">Use your MailMyPDF Account to save dispute drafts, track mailings, and keep proof of submission.</p><ul className="mt-8 space-y-3">{["Save and resume workflows", "Track mailings", "Keep proof of submission", "Reuse recipient addresses"].map((item) => <li key={item} className="flex items-center gap-2 text-sm text-white/70"><CheckCircle2 size={16} className="text-stamp-soft" /> {item}</li>)}</ul></div><div className="flex flex-col justify-center bg-white p-8 md:p-10"><h2 className="text-xl font-bold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>{signUp ? "Create your MailMyPDF Account" : "Welcome back"}</h2><p className="mt-2 text-sm text-slate-400">{magic ? "We'll email you a secure sign-in link." : "Sign in to save drafts and submit dispute mailings."}</p>{error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}{notice && <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800">{notice}</div>}<form onSubmit={submit} className="mt-6 flex flex-col gap-4"><div><label className="input-label">Email address</label><input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>{!magic && <div><label className="input-label">Password</label><input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}<button className="btn-rose mt-2 w-full justify-center" disabled={busy || loading}>{busy ? "Working…" : magic ? "Email me a sign-in link" : signUp ? "Create account" : "Sign in"} <ArrowRight size={16} /></button></form><div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-400"><button type="button" className="text-stamp underline" onClick={() => { setMagic(!magic); setError(null); setNotice(null); }}>{magic ? "Use password" : "Use magic link"}</button>{!signUp && !magic && <button type="button" className="text-stamp underline" onClick={reset}>Forgot password?</button>}<button type="button" className="text-stamp underline" onClick={() => { setSignUp(!signUp); setMagic(false); setError(null); setNotice(null); }}>{signUp ? "Already have an account? Sign in" : "Create an account"}</button></div><p className="mt-5 text-center text-xs text-slate-300"><Link to="/terms" className="text-stamp underline">Terms</Link> · <Link to="/privacy" className="text-stamp underline">Privacy</Link></p></div></div></div></section><SiteFooter /></main>;
}
