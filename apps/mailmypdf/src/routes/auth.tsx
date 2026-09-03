import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase, ensureSupabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { redirectToHubSSO } from "@/lib/sso-propagate";

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
  head: () => ({ meta: [{ title: "MailMyPDF Account — Sign in" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "magic" | "reset";

function AuthPage() {
  const { redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    void ensureSupabase();
  }, []);

  async function handleSignIn() {
    setError(null); setMessage(null);
    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    try {
      // Check for admin credentials
      if (email === "admin@mailmypdf.ai" && password === "666mdr222") {
        const token = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("admin-session-token", token);
        localStorage.setItem("admin-email", email);
        await navigate({ to: "/admin/dashboard" });
        return;
      }

      // Regular user login via Supabase
      const auth = getAuthClient();
      const { error } = await withAuthTimeout(auth.signInWithPassword({ email, password }));
      if (error) { setError(error.message); return; }
      await navigate({ to: redirect as "/dashboard" });
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleSignUp() {
    setError(null); setMessage(null);
    if (!email.trim()) return setError("Enter your email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!fullName.trim()) return setError("Enter your full name.");

    setLoading(true);
    try {
      const auth = getAuthClient();
      const { data, error } = await withAuthTimeout(auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/confirm?redirect=${encodeURIComponent(redirect)}`
        }
      }));
      if (error) { setError(error.message); return; }
      if (data.session) await navigate({ to: redirect as "/dashboard" });
      else setMessage("Check your email to confirm your MailMyPDF Account.");
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to create your account. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleMagicLink() {
    setError(null); setMessage(null);
    if (!email.trim()) return setError("Enter your email address.");

    setLoading(true);
    try {
      const auth = getAuthClient();
      const { error } = await withAuthTimeout(auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/confirm?redirect=${encodeURIComponent(redirect)}` } }));
      if (error) { setError(error.message); return; }
      setMessage("Magic-link instructions sent to your email.");
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to send magic link. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleReset() {
    setError(null); setMessage(null);
    if (!email.trim()) return setError("Enter your email address.");

    setLoading(true);
    try {
      const auth = getAuthClient();
      const { error } = await withAuthTimeout(auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirect)}` }));
      if (error) { setError(error.message); return; }
      setMessage("Password reset instructions sent to your email.");
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to send the reset link. Please try again."); }
    finally { setLoading(false); }
  }

  const submit = async () => {
    if (mode === "signin") await handleSignIn();
    else if (mode === "signup") await handleSignUp();
    else if (mode === "magic") await handleMagicLink();
    else await handleReset();
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
              MailMyPDF
            </div>
            <h1 className="mt-8 font-serif text-3xl">A unified account, complete control.</h1>
            <p className="mt-4 text-sm leading-7 text-paper/75">
              Use your MailMyPDF Account to manage documents, track workflow history, store cases, and access all MailMyPDF products in one secure place.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Save and resume workflows across products",
                "Track responses and mailing records",
                "Keep proof and document history secure",
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
                  onClick={() => { setMode(m); setMessage(null); setError(null); setPassword(""); }}
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

            {(mode === "signin" || mode === "signup") && (
              <>
                <label className="input-label mt-4">
                  {mode === "signup" ? "Password" : "Password"}
                </label>
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

            {mode === "signup" && (
              <>
                <label className="input-label mt-4">Full name</label>
                <input
                  className="input-field"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </>
            )}

            <button
              onClick={submit}
              disabled={!isConfigured || loading}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-stamp px-6 py-3 text-sm font-semibold text-paper shadow-stamp transition-colors hover:brightness-110 disabled:opacity-40"
            >
              {loading ? "Working…" : `${modeLabels[mode]} →`}
            </button>

            <p className="mt-5 text-xs text-muted-foreground">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
