import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { authenticatedHeaders } from "@/lib/authenticated-client";

type PaymentReadiness = {
  accountReady: boolean;
  payment: {
    ready: boolean;
    display: string | null;
    brand: string | null;
    last4: string | null;
  };
  setupUrl: string;
  chargingAuthorized: false;
  note: string;
};

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function authorizedJson(url: string, init?: RequestInit) {
  const headers = {
    ...(await authenticatedHeaders()),
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers ?? {}),
  };
  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "MailMyPDF account setup failed.";
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const Route = createFileRoute("/account/setup")({
  validateSearch: (search: Record<string, unknown>) => ({
    return_to: typeof search.return_to === "string" ? search.return_to : "/dashboard",
    setup: typeof search.setup === "string" ? search.setup : "",
    session_id: typeof search.session_id === "string" ? search.session_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Account setup — MailMyPDF" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccountSetupPage,
});

function AccountSetupPage() {
  const search = Route.useSearch();
  const returnTo = useMemo(() => safeReturnTo(search.return_to), [search.return_to]);
  const [readiness, setReadiness] = useState<PaymentReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redirectToAuth() {
    const here = window.location.pathname + window.location.search;
    window.location.assign(`/auth?redirect=${encodeURIComponent(here)}`);
  }

  async function loadReadiness() {
    const query = new URLSearchParams({ return_to: returnTo });
    const payload = await authorizedJson(`/api/account/payment-readiness?${query.toString()}`);
    setReadiness(payload as unknown as PaymentReadiness);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        if (search.setup === "success" && search.session_id) {
          await authorizedJson("/api/account/payment-setup/sync", {
            method: "POST",
            body: JSON.stringify({ session_id: search.session_id }),
          });
        }
        if (!active) return;
        await loadReadiness();
      } catch (cause) {
        if (!active) return;
        const status = (cause as Error & { status?: number }).status;
        if (status === 401 || /sign in/i.test(cause instanceof Error ? cause.message : "")) {
          redirectToAuth();
          return;
        }
        setError(cause instanceof Error ? cause.message : "Unable to load account setup.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [search.setup, search.session_id, returnTo]);

  async function startPaymentSetup() {
    try {
      setStarting(true);
      setError(null);
      const payload = await authorizedJson("/api/account/payment-setup", {
        method: "POST",
        body: JSON.stringify({ return_to: returnTo }),
      });
      const url = typeof payload.setupUrl === "string" ? payload.setupUrl : null;
      if (!url) throw new Error("Stripe did not return a payment setup page.");
      window.location.assign(url);
    } catch (cause) {
      const status = (cause as Error & { status?: number }).status;
      if (status === 401) {
        redirectToAuth();
        return;
      }
      setError(cause instanceof Error ? cause.message : "Unable to start payment setup.");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-rule bg-card p-6 shadow-card sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/5 text-cobalt">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">
            MailMyPDF account setup
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Make future approved mailings seamless
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Your MailMyPDF account is required for connector access. Adding a payment method is optional,
            but it allows a future mailing you explicitly approve in chat to continue without a separate
            checkout visit.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rule p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Account
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {loading ? "Checking your account…" : readiness?.accountReady ? "Signed in and ready." : "Sign in is required."}
              </p>
            </div>
            <div className="rounded-xl border border-rule p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-cobalt" aria-hidden="true" />
                Payment method
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {loading
                  ? "Checking payment readiness…"
                  : readiness?.payment.ready
                    ? readiness.payment.display ?? "Saved payment method ready."
                    : "Optional — no saved payment method yet."}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-rule bg-paper-deep/35 p-4 text-xs leading-5 text-muted-foreground">
            <strong className="text-foreground">Saving a card never authorizes a mailing or charge.</strong>{" "}
            MailMyPDF still requires approval of the exact document or batch, recipient address, mail
            service, and price before a saved payment method can be used.
          </div>

          {search.setup === "cancelled" ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Payment setup was cancelled. You can continue without a saved payment method.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startPaymentSetup()}
              disabled={loading || starting}
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {starting
                ? "Opening Stripe…"
                : readiness?.payment.ready
                  ? "Replace payment method"
                  : "Add payment method"}
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(returnTo)}
              disabled={loading}
              className="inline-flex items-center rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-60"
            >
              {readiness?.payment.ready ? "Continue" : "Skip for now"}
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
