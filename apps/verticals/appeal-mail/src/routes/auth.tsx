import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Stamp, ArrowRight, CheckCircle2, Loader2, AlertCircle, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { redirectToHubSSO } from "@/lib/sso-propagate";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign In — MailMyPDF Account" },
    { name: "description", content: "Create a MailMyPDF account or sign in to access Appeal Mail and other MailMyPDF products." },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: AuthPage,
});

type AuthMode = "signin" | "signup" | "reset";

function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/auth" }) as { returnTo?: string };
  const { signUp, signIn, resetPassword, isConfigured } = useAuth();

  async function handleSubmit() {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === "signup") {
        const { error, needsConfirmation } = await signUp(email, password || undefined);
        if (error) { setError(error); setLoading(false); return; }
        if (needsConfirmation) setSuccess(`We sent a confirmation link to ${email}. Click the link to complete your account.`);
        else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) { setError(error); setLoading(false); return; }
        navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else {
        const { error } = await resetPassword(email);
        if (error) { setError(error); setLoading(false); return; }
        setSuccess("We sent a password reset link to your email.");
      }
    } catch (err) {
      setError((err as Error).message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="py-12 md:py-20">
        <div className="container max-w-4xl">
          <div className="grid overflow-hidden rounded-2xl border border-warm-border md:grid-cols-2">
            <div className="p-8 md:p-10" style={{ background: "linear-gradient(135deg, var(--ink) 0%, color-mix(in oklab, var(--ink) 80%, var(--ink-soft)) 100%)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Mail size={18} className="text-stamp" /></div>
                <div className="flex flex-col"><span className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>MailMyPDF Account</span><span className="font-mono text-[10px] uppercase tracking-widest text-white/40">One account. Every product.</span></div>
              </div>
              <h1 className="mt-8 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Your appeals, organized and sent.</h1>
              <p className="mt-4 text-sm leading-7 text-white/60">A MailMyPDF Account gives you access to Appeal Mail and every future MailMyPDF product with one login.</p>
              <ul className="mt-8 space-y-3">{["Save and resume workflows","Track all mailings in one place","Keep proof of timely filing","Re-use recipient addresses","Access all MailMyPDF products"].map((item) => <li key={item} className="flex items-center gap-2 text-sm text-white/70"><CheckCircle2 size={16} className="text-stamp" /> {item}</li>)}</ul>
              <div className="mt-10 border-t border-white/10 pt-6"><div className="flex items-center gap-2 text-xs text-white/40"><Stamp size={14} /><span>Appeal Mail is a MailMyPDF product</span></div></div>
            </div>
            <div className="flex flex-col justify-center bg-white p-8 md:p-10">
              {success ? (
                <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--stamp) 10%, transparent)" }}><CheckCircle2 size={32} className="text-stamp" /></div><h2 className="mt-5 text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Check your email</h2><p className="mt-3 text-sm text-muted-foreground">{success}</p><button onClick={() => { setSuccess(null); setMode("signin"); }} className="btn-outline mt-6">Back to sign in</button></div>
              ) : (
                <>
                  <div className="flex gap-1 rounded-xl bg-muted/50 p-1"><button onClick={() => setMode("signup")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-white text-ink shadow-sm" : "text-muted-foreground"}`}>Create account</button><button onClick={() => setMode("signin")} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "signin" ? "bg-white text-ink shadow-sm" : "text-muted-foreground"}`}>Sign in</button></div>
                  <div className="mt-6">
                    <h2 className="text-xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{mode === "signup" ? "Create your MailMyPDF Account" : mode === "signin" ? "Welcome back" : "Reset password"}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{mode === "signup" ? "Start saving and tracking your appeals." : mode === "signin" ? "Sign in to access your saved appeals." : "Enter your email and we'll send a reset link."}</p>
                    {error && <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
                    {!isConfigured && <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info-bg px-4 py-3 text-sm text-info"><AlertCircle size={16} className="mt-0.5 shrink-0" /> MailMyPDF Account authentication is being configured. Check back soon.</div>}
                    <label className="input-label mt-5">Email address</label><input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    {mode !== "reset" && <><label className="input-label mt-4">Password</label><input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Create a password" : "Your password"} /></>}
                    <button onClick={handleSubmit} disabled={loading || !email.trim()} className="btn-amber mt-5 w-full justify-center">{loading ? <><Loader2 size={16} className="animate-spin" /> Please wait…</> : <>{mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}<ArrowRight size={16} /></>}</button>
                    {mode === "signin" && <button onClick={() => setMode("reset")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">Forgot your password?</button>}
                    {mode === "reset" && <button onClick={() => setMode("signin")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">Back to sign in</button>}
                    {mode !== "reset" && <div className="mt-6"><div className="relative flex items-center gap-3"><div className="h-px flex-1 bg-rule/60" /><span className="text-xs text-muted-foreground">or</span><div className="h-px flex-1 bg-rule/60" /></div><button onClick={() => redirectToHubSSO(searchParams?.returnTo || window.location.origin + "/dashboard")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-rule px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-muted/50"><Mail size={16} /> Continue with MailMyPDF Account</button><p className="mt-2 text-center text-xs text-muted-foreground">One account works across all MailMyPDF products.</p></div>}
                    <p className="mt-5 text-xs text-muted-foreground">By continuing, you agree to our{" "}<Link to="/terms" className="text-stamp hover:underline">Terms</Link> and{" "}<Link to="/privacy" className="text-stamp hover:underline">Privacy Policy</Link>.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
