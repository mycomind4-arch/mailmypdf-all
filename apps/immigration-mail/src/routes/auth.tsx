import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Immigration Mail" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/auth" }) as { returnTo?: string };

  useEffect(() => {
    if (!authLoading && user) navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim()) { setError("Enter your email address."); return; }
    if (mode === "password" && !password.trim()) { setError("Enter your password."); return; }
    setIsSubmitting(true);
    try {
      if (mode === "magic") {
        const result = await signInWithMagicLink(email.trim());
        if (result.error) setError(result.error);
        else setNotice("Check your email for a secure sign-in link.");
      } else if (isSignUp) {
        const result = await signUp(email.trim(), password);
        if (result.error) setError(result.error);
        else if (result.needsConfirmation) setNotice("Check your email to confirm your account before signing in.");
        else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) setError(result.error);
        else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError(null); setNotice(null);
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);
    if (result.error) setError(result.error); else setNotice("Password reset instructions have been sent if this account exists.");
  };

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="overflow-hidden rounded-2xl border border-rule md:grid md:grid-cols-2">
          {/* Side panel */}
          <div className="hidden p-8 md:block md:p-10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.30 0.05 255) 0%, oklch(0.24 0.03 260) 100%)" }}>
            <img src="/img/abstract-layers.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" loading="eager" />
            <div className="relative">
              <div className="postmark w-fit" style={{ borderColor: "color-mix(in oklab, var(--brass) 50%, transparent)", color: "var(--brass)" }}>Immigration Mail</div>
              <h1 className="mt-8 font-serif text-3xl" style={{ color: "oklch(0.975 0.012 80)" }}>Your immigration correspondence, organized and sent.</h1>
              <p className="mt-4 text-sm leading-7" style={{ color: "oklch(0.975 0.012 80 / 0.6)" }}>Use the same MailMyPDF Account across the ecosystem while keeping your immigration cases private to your account.</p>
            </div>
          </div>
          {/* Form */}
          <div className="flex flex-col justify-center bg-card p-6 sm:p-8 md:p-10">
            <h2 className="font-serif text-2xl">{isSignUp ? "Create your MailMyPDF Account" : "Welcome back"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{mode === "magic" ? "We'll email you a secure sign-in link." : "Sign in to save cases, drafts, and mailing history."}</p>
            {error && <div className="alert alert-error mt-4">{error}</div>}
            {notice && <div className="alert alert-info mt-4">{notice}</div>}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div><label className="input-label" htmlFor="email">Email address</label><input id="email" className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} autoCapitalize="none" autoCorrect="off" /></div>
              {mode === "password" && <div><label className="input-label" htmlFor="password">Password</label><input id="password" className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} /></div>}
              <button type="submit" disabled={isSubmitting || authLoading} className="btn-primary mt-2 w-full" style={{ background: "var(--navy)" }}>{isSubmitting ? "Working…" : mode === "magic" ? "Email me a sign-in link →" : isSignUp ? "Create account →" : "Sign in →"}</button>
            </form>
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <button type="button" onClick={() => { setMode(mode === "password" ? "magic" : "password"); setNotice(null); setError(null); }} className="text-brass underline">{mode === "password" ? "Use a magic link" : "Use password"}</button>
              {!isSignUp && mode === "password" && <button type="button" onClick={handleReset} disabled={isSubmitting} className="text-brass underline">Forgot password?</button>}
              {mode === "password" && <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null); setNotice(null); }} className="text-brass underline">{isSignUp ? "Already have an account? Sign in" : "Create an account"}</button>}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground"><Link to="/privacy" className="underline">Privacy</Link> · <Link to="/terms" className="underline">Terms</Link></p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
