import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ensureSupabase, supabase } from "@/integrations/supabase/client";

type ConsentDetails = {
  authorization_id: string;
  client: {
    name?: string | null;
    client_name?: string | null;
  };
  redirect_uri?: string | null;
  scope?: string | null;
};

function asConsentDetails(value: unknown): ConsentDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!("authorization_id" in value) || typeof value.authorization_id !== "string") return null;

  const raw = value as Record<string, unknown>;
  const client =
    raw.client && typeof raw.client === "object" && !Array.isArray(raw.client)
      ? raw.client as Record<string, unknown>
      : {};

  return {
    authorization_id: raw.authorization_id as string,
    client: {
      name: typeof client.name === "string" ? client.name : null,
      client_name: typeof client.client_name === "string" ? client.client_name : null,
    },
    redirect_uri: typeof raw.redirect_uri === "string" ? raw.redirect_uri : null,
    scope: typeof raw.scope === "string" ? raw.scope : null,
  };
}

function redirectUrl(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>).redirect_url;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function scopeLabel(scope: string): string {
  switch (scope) {
    case "email":
      return "See the email address on your MailMyPDF account";
    case "profile":
      return "See basic MailMyPDF profile information";
    case "openid":
      return "Confirm your MailMyPDF identity";
    case "phone":
      return "See the phone number on your MailMyPDF account";
    default:
      return scope;
  }
}

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id:
      typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Connect an AI assistant — MailMyPDF" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: OAuthConsentPage,
});

function OAuthConsentPage() {
  const { authorization_id: authorizationId } = useSearch({ from: "/oauth/consent" });
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<"approve" | "deny" | null>(null);

  const requestedScopes = useMemo(
    () => (details?.scope ?? "").split(/\s+/).map((scope) => scope.trim()).filter(Boolean),
    [details?.scope],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!authorizationId) {
        setError("This authorization request is missing its authorization id.");
        setLoading(false);
        return;
      }

      await ensureSupabase();
      const auth = supabase.auth;
      if (!auth) {
        setError("MailMyPDF account services are not configured.");
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await auth.getUser();
      if (userError || !userData.user) {
        const returnTo = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
        window.location.assign(`/auth?redirect=${encodeURIComponent(returnTo)}`);
        return;
      }

      const oauth = auth.oauth;
      if (!oauth) {
        setError("This MailMyPDF deployment does not yet support OAuth account linking.");
        setLoading(false);
        return;
      }

      const { data, error: detailsError } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;

      if (detailsError || !data) {
        setError(detailsError?.message ?? "This authorization request is invalid or expired.");
        setLoading(false);
        return;
      }

      const alreadyApprovedRedirect = redirectUrl(data);
      if (alreadyApprovedRedirect && !("authorization_id" in data)) {
        window.location.replace(alreadyApprovedRedirect);
        return;
      }

      const normalized = asConsentDetails(data);
      if (!normalized) {
        setError("MailMyPDF could not read the authorization request.");
        setLoading(false);
        return;
      }

      setDetails(normalized);
      setLoading(false);
    }

    void load().catch((cause) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "Unable to load the authorization request.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(decision: "approve" | "deny") {
    if (!authorizationId || deciding) return;
    setDeciding(decision);
    setError(null);

    try {
      await ensureSupabase();
      const oauth = supabase.auth?.oauth;
      if (!oauth) throw new Error("MailMyPDF OAuth account linking is not configured.");

      const response =
        decision === "approve"
          ? await oauth.approveAuthorization(authorizationId)
          : await oauth.denyAuthorization(authorizationId);

      if (response.error) throw response.error;
      const next = redirectUrl(response.data);
      if (!next) throw new Error("The authorization server did not provide a return URL.");
      window.location.assign(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your authorization choice.");
      setDeciding(null);
    }
  }

  const clientName =
    details?.client.name?.trim() ||
    details?.client.client_name?.trim() ||
    "AI assistant";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="rounded-2xl border border-rule bg-card p-6 shadow-card sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cobalt/20 bg-cobalt/5 text-cobalt">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt">
            Account connection
          </div>
          <h1 className="mt-2 font-serif text-3xl text-foreground">
            Connect {clientName} to MailMyPDF
          </h1>

          {loading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading authorization details…</p>
          ) : error && !details ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          ) : details ? (
            <>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                This connection lets the assistant act through your MailMyPDF account only after
                you approve the connection. Creating or mailing a document still follows
                MailMyPDF&apos;s workflow, review, packet-approval, and checkout safeguards.
              </p>

              <div className="mt-6 rounded-xl border border-rule bg-paper-deep/35 p-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Requested account access
                </div>
                {requestedScopes.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {requestedScopes.map((scope) => (
                      <li key={scope} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{scopeLabel(scope)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Basic MailMyPDF account access.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-rule p-4 text-xs leading-5 text-muted-foreground">
                <strong className="text-foreground">What this does not approve:</strong> connecting
                an assistant does not approve a specific PDF, recipient, price, payment, or mailing.
                Those consequential steps remain separately validated by MailMyPDF.
              </div>

              {details.redirect_uri ? (
                <p className="mt-4 break-all text-[10px] text-muted-foreground">
                  Return destination: {details.redirect_uri}
                </p>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void decide("approve")}
                  disabled={deciding !== null}
                  className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {deciding === "approve" ? "Connecting…" : "Approve connection"}
                </button>
                <button
                  type="button"
                  onClick={() => void decide("deny")}
                  disabled={deciding !== null}
                  className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {deciding === "deny" ? "Denying…" : "Deny"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
