import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { signIn, signUp, signInWithMagicLink, resetPassword, isConfigured } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/auth" }) as { returnTo?: string };
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(error);
        else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else if (mode === "signup") {
        const { error, needsConfirmation } = await signUp(email, password);
        if (error) setError(error);
        else if (needsConfirmation)
          setInfo("Check your email to confirm your account before signing in.");
        else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
      } else if (mode === "reset") {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setInfo("Password reset instructions sent to your email.");
      } else if (mode === "magic") {
        const { error } = await signInWithMagicLink(email);
        if (error) setError(error);
        else setInfo("Check your email for a sign-in link.");
      }
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<typeof mode, string> = {
    signin: "Sign in to your Private Office",
    signup: "Create your Private Office",
    reset: "Reset your password",
    magic: "Sign in with a magic link",
  };

  return (
    <main className="flex min-h-screen flex-col bg-ivory">
      <SiteHeader />
      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="section-kicker text-center">Private Access</div>
          <h1 className="mt-4 text-center text-4xl leading-tight text-charcoal">
            {titles[mode]}
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-stone">
            Your matters, evidence, correspondence, and delivery records are isolated to your account.
          </p>

          <div className="mt-8 rounded-xl border border-rule bg-paper p-8 shadow-card">
            {!isConfigured && (
              <p className="mb-4 alert alert-warning">
                Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable account access.
              </p>
            )}
            {error && <p className="mb-4 alert alert-danger">{error}</p>}
            {info && <p className="mb-4 alert alert-success">{info}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              {(mode === "signin" || mode === "signup") && (
                <div>
                  <label className="input-label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Send magic link"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {mode !== "signin" && (
                <button onClick={() => { setMode("signin"); setError(null); setInfo(null); }} className="btn-ghost">
                  Sign in
                </button>
              )}
              {mode !== "signup" && (
                <button onClick={() => { setMode("signup"); setError(null); setInfo(null); }} className="btn-ghost">
                  Create account
                </button>
              )}
              {mode !== "reset" && (
                <button onClick={() => { setMode("reset"); setError(null); setInfo(null); }} className="btn-ghost">
                  Forgot password?
                </button>
              )}
              {mode !== "magic" && (
                <button onClick={() => { setMode("magic"); setError(null); setInfo(null); }} className="btn-ghost">
                  Magic link
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
