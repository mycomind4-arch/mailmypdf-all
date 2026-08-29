import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EnterpriseHeader, EnterpriseFooter } from "@/components/enterprise-chrome";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify Proof of Service" },
      {
        name: "description",
        content:
          "Verify a proof of service by tracking number and document hash. Public, no login required. See the facts of the send and delivery — custody chain, timestamps, and mail type.",
      },
      { property: "og:title", content: "Verify Proof of Service" },
      { property: "og:description", content: "Public verification portal for proof of service. No login required." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/verify" }],
  }),
  component: VerifyPage,
});

interface CustodyEvent {
  timestamp: string;
  event_type: string;
  description: string;
  event_hash: string;
  prior_event_hash: string | null;
}

interface VerifyResponse {
  verified: boolean;
  tracking_number?: string;
  carrier?: string;
  mail_type?: string;
  status?: string;
  sent_at?: string | null;
  delivered_at?: string | null;
  document_sha256?: string;
  legal_citation?: string | null;
  legal_description?: string | null;
  response_window_ends?: string | null;
  custody_chain?: CustodyEvent[];
  message?: string;
}

function VerifyPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber || !documentHash) {
      setError("Both tracking number and document hash are required.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/v1/verify/${encodeURIComponent(trackingNumber)}?document_hash=${encodeURIComponent(documentHash)}`,
      );
      const data: VerifyResponse = await res.json();
      setResult(data);
    } catch {
      setError("Could not reach the verification service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <EnterpriseHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-sm font-semibold text-blue-600">Public Verification</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          Verify a Proof of Service
        </h1>
        <p className="mt-4 max-w-xl text-slate-600">
          Enter the USPS tracking number and the document hash (SHA-256) to verify that a notice
          was sent and delivered. No login required — this portal is accessible to anyone who
          needs to verify a proof of service: judges, auditors, opposing counsel, or compliance
          officers.
        </p>

        <form onSubmit={handleVerify} className="mt-8 rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <label htmlFor="tracking" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tracking Number
            </label>
            <input
              id="tracking"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="9405 5118 9959 9xxxxxxx"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label htmlFor="hash" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Document Hash (SHA-256)
            </label>
            <input
              id="hash"
              type="text"
              value={documentHash}
              onChange={(e) => setDocumentHash(e.target.value)}
              placeholder="a3f5b8c1d2e4f6a7..."
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        {result && <VerifyResult result={result} />}

        <div className="mt-8 rounded-md bg-slate-50 p-4 text-sm text-slate-500">
          <p className="font-medium text-slate-700">What you'll see</p>
          <p className="mt-1">
            This portal returns only the facts of the send and delivery — tracking number,
            carrier, mail type, status, timestamps, and the custody chain. No tenant data,
            recipient PII, or legal strategy is exposed.
          </p>
        </div>
      </main>
      <EnterpriseFooter />
    </div>
  );
}

function VerifyResult({ result }: { result: VerifyResponse }) {
  if (!result.verified) {
    return (
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Not Verified</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {result.message || "No matching proof record found for the provided tracking number and document hash."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Verified banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Verified</h2>
            <p className="text-sm text-slate-600">This proof of service is confirmed and the custody chain is intact.</p>
          </div>
        </div>
      </div>

      {/* Key facts */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivery Facts</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <FactRow label="Tracking Number" value={result.tracking_number || "—"} mono />
          <FactRow label="Carrier" value={result.carrier || "—"} />
          <FactRow label="Mail Type" value={result.mail_type || "—"} />
          <FactRow label="Status" value={<StatusBadge status={result.status || "unknown"} />} />
          <FactRow label="Sent At" value={formatDate(result.sent_at)} />
          <FactRow label="Delivered At" value={formatDate(result.delivered_at)} />
          <FactRow label="Document SHA-256" value={result.document_sha256 || "—"} mono />
        </dl>
      </div>

      {/* Legal reference */}
      {(result.legal_citation || result.legal_description || result.response_window_ends) && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal Reference</h3>
          <dl className="mt-4 space-y-3">
            {result.legal_citation && <FactRow label="Citation" value={result.legal_citation} />}
            {result.legal_description && <FactRow label="Description" value={result.legal_description} />}
            {result.response_window_ends && (
              <FactRow label="Response Window Ends" value={formatDate(result.response_window_ends)} />
            )}
          </dl>
        </div>
      )}

      {/* Custody chain */}
      {result.custody_chain && result.custody_chain.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Custody Chain ({result.custody_chain.length} events)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Each event is hash-linked to the prior event. Tampering with any event breaks the chain.
          </p>
          <ol className="mt-6 space-y-0">
            {result.custody_chain.map((event, i) => (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < result.custody_chain!.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200" aria-hidden />
                )}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
                  <div className="h-2 w-2 rounded-full bg-slate-900" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">{event.event_type}</span>
                    <span className="font-mono text-xs text-slate-400">{formatDate(event.timestamp)}</span>
                  </div>
                  {event.description && <p className="mt-1 text-sm text-slate-600">{event.description}</p>}
                  <div className="mt-1 font-mono text-[10px] text-slate-400">
                    hash: {event.event_hash?.slice(0, 16)}...
                    {event.prior_event_hash && ` ← prior: ${event.prior_event_hash?.slice(0, 16)}...`}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        This verification shows only the facts of the send and delivery. No tenant data, recipient PII, or legal strategy is exposed.
      </p>
    </div>
  );
}

function FactRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-1 text-sm text-slate-900 ${mono ? "font-mono break-all" : ""}`}>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "delivered" ? "bg-emerald-50 text-emerald-700" :
    status === "in_transit" ? "bg-blue-50 text-blue-700" :
    status === "sent" ? "bg-slate-100 text-slate-600" :
    "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return dateStr;
  }
}
