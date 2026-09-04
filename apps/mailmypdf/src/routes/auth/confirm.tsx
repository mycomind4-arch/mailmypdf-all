import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const AUTH_TIMEOUT_MS = 15_000;

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: number | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("Account service timed out. Please try again.")), AUTH_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/dashboard",
    code: typeof s.code === "string" ? s.code : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
    errorDescription: typeof s.error_description === "string" ? s.error_description : undefined,
  }),
  head: () => ({ meta: [{ title: "Confirm your email — MailMyPDF" }, { name: "robots", content: "noindex" }] }),
  component: ConfirmEmailPage,
});

function ConfirmEmailPage() {
  const { redirect, code, error: queryError, errorDescription } = useSearch({ from: "/auth/confirm" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Confirming your email address…");

  useEffect(() => {
    let active = true;

    async function confirm() {
      if (queryError) {
        setStatus("error");
        setMessage(errorDescription || "This confirmation link is invalid or has expired.");
        return;
      }

      const auth = supabase?.auth;
      if (!auth) {
        setStatus("error");
        setMessage("Account services are not configured. Please try again later.");
        return;
      }

      try {
        if (code) {
          const { error } = await withTimeout(auth.exchangeCodeForSession(code));
          if (error) throw error;
        }

        const { data, error } = await withTimeout(auth.getSession());
        if (error) throw error;
        if (!data.session) throw new Error("No active session was created. The confirmation link may be expired or already used.");
        if (!active) return;

        setStatus("success");
        setMessage("Your email is confirmed. Taking you to your MailMyPDF workspace…");
        window.setTimeout(() => {
          if (active) void navigate({ to: redirect as "/dashboard" });
        }, 600);
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "We couldn't confirm your email. Please try again.");
      }
    }

    void confirm();
    return () => { active = false; };
  }, [navigate, redirect, code, queryError, errorDescription]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="postmark mx-auto w-fit">Account</div>
        <h1 className="mt-4 font-serif text-4xl">{status === "working" ? "Confirming your email" : status === "success" ? "Email confirmed" : "Confirmation problem"}</h1>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{message}</p>
        {status === "error" && (
          <div className="mt-8 flex justify-center gap-3">
            <button onClick={() => void navigate({ to: "/auth", search: { redirect: "/dashboard" } })} className="rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white">Back to sign in</button>
            <button onClick={() => window.location.reload()} className="rounded-full border border-rule px-5 py-2 text-sm">Try again</button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
