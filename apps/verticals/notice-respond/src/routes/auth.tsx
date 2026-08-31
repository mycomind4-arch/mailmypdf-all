import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "MailMyPDF Account — Notice Respond" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "magic" | "reset";

function AuthPage() {
  const { user, loading, isConfigured, signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/auth" }) as { returnTo?: string };
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm text-muted-foreground">Loading MailMyPDF Account…</p>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="postmark mx-auto w-fit">MailMyPDF Account</div>
          <h1 className="mt-6 font-serif text-4xl">You're already signed in.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Continue to your Notice Respond cases or manage your account.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to={(searchParams?.returnTo || "/dashboard") as "/dashboard"} className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              My cases
            </Link>
            <Link to="/" className="rounded-full border border-input px-6 py-3 text-sm font-medium">
              Home
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) return setError("Enter your email address.");
    if (mode !== "magic" && mode !== "reset" && password.length < 8) return setError("Password must be at least 8 characters.");
    const result =
      mode === "signup" ? await signUp(email.trim(), password)
      : mode === "magic" ? await signInWithMagicLink(email.trim())
      : mode === "reset" ? await resetPassword(email.trim())
      : await signIn(email.trim(), password);
    if (result.error) setError(result.error);
    else if (result.needsConfirmation) setMessage("Check your email to confirm your MailMyPDF Account.");
    else if (mode === "reset") setMessage("Password reset instructions sent.");
    else if (mode === "magic") setMessage("Magic-link instructions sent.");
    else navigate({ to: (searchParams?.returnTo || "/dashboard") as "/dashboard" });
  };

  const modeLabels: Record<Mode, string> = {
    signin: "Sign in",
    signup: "Create account",
    magic: "Magic link",
    reset: "Reset",
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <div className="grid overflow-hidden rounded-2xl border border-rule shadow-card md:grid-cols-2">
          {/* Left — brand panel */}
          <div className="bg-ink p-8 text-paper md:p-10">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">
              Notice Respond
            </div>
            <h1 className="mt-8 font-serif text-3xl">A MailMyPDF product, one account.</h1>
            <p className="mt-4 text-sm leading-7 text-paper/75">
              Use your MailMyPDF Account to save cases, documents, drafts, mailing history, and future MailMyPDF products in one place.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Save and resume Notice Respond workflows",
                "Track responses and mailing records",
                "Keep proof and case history together",
                "Use one account across the MailMyPDF ecosystem",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-paper/80">
                  <svg className="h-4 w-4 shrink-0 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — form panel */}
          <div className="bg-card p-8 md:p-10">
            <div className="mb-6 flex flex-wrap gap-2 text-sm">
              {(["signin", "signup", "magic", "reset"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setMessage(null); setError(null); }}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    mode === m ? "bg-ink text-paper" : "border border-input hover:border-ink/30"
                  }`}
                >
                  {modeLabels[m]}
                </button>
              ))}
            </div>

            {!isConfigured && (
              <div className="mb-5 rounded-lg border border-warning-border bg-warning-bg p-3 text-sm text-warning">
                MailMyPDF Account is not configured in this environment yet.
              </div>
            )}
            {error && (
              <div className="mb-5 rounded-lg border border-danger-border bg-danger-bg p-3 text-sm text-danger">{error}</div>
            )}
            {message && (
              <div className="mb-5 rounded-lg border border-success-border bg-success-bg p-3 text-sm text-success">{message}</div>
            )}

            <label className="input-label">Email address</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            {mode !== "magic" && mode !== "reset" && (
              <>
                <label className="input-label mt-4">Password</label>
                <input
                  className="input-field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </>
            )}

            <button
              onClick={submit}
              disabled={!isConfigured}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-stamp px-6 py-3 text-sm font-semibold text-paper shadow-stamp transition-colors hover:brightness-110 disabled:opacity-40"
            >
              {modeLabels[mode]} →
            </button>

            <p className="mt-5 text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-stamp hover:underline">Terms</Link> and{" "}
              <Link to="/privacy" className="text-stamp hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
