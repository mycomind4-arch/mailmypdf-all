import { createFileRoute, Link } from "@tanstack/react-router";
import { EnterpriseHeader, EnterpriseFooter, ComplianceDisclaimer } from "@/components/enterprise-chrome";

export const Route = createFileRoute("/proof-of-service")({
  head: () => ({
    meta: [
      { title: "Proof of Service — Verifiable Notice Delivery Infrastructure" },
      {
        name: "description",
        content:
          "Infrastructure API for generating and proving compliant notice delivery. Document hashing, hash-chained custody events, USPS tracking, and public proof bundles. For code enforcement, landlord-tenant, FDCPA debt collection, HOA, and insurance.",
      },
      { property: "og:title", content: "Proof of Service — Verifiable Notice Delivery Infrastructure" },
      {
        property: "og:description",
        content:
          "Cryptographic proof of service for legal notices. Document hashes, custody chains, USPS tracking, public verification. Enterprise API for code enforcement, landlord-tenant, debt collection, HOA, and insurance.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/pos-og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Proof of Service — Verifiable Notice Delivery Infrastructure" },
      {
        name: "twitter:description",
        content:
          "Cryptographic proof that a notice was sent and delivered. Document hashing, hash-chained custody events, USPS tracking, and public verification. Enterprise API for code enforcement, landlord-tenant, debt collection, HOA, and insurance.",
      },
      { name: "twitter:image", content: "/pos-og-image.png" },
    ],
    links: [{ rel: "canonical", href: "/proof-of-service" }],
  }),
  component: ProofOfServicePage,
});

function ProofOfServicePage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <EnterpriseHeader />
      <Hero />
      <TrustBar />
      <WhatItDoes />
      <HowItWorks />
      <APIEndpoints />
      <Verticals />
      <Pricing />
      <SecuritySection />
      <ComplianceSection />
      <FinalCTA />
      <EnterpriseFooter />
    </div>
  );
}

/* ----------------------------------------------------------------- Hero */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-700 bg-slate-900 text-white"
      style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.10) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.08) 0%, transparent 50%)" }}>
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: headline + CTAs */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Infrastructure API · Now in private beta
            </div>
            <h1 className="mt-6 text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Cryptographic proof
              <br />
              that a notice was sent and delivered.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              An evidence API for legal notice delivery. Generate tamper-proof proof bundles with document hashing, hash-chained custody events, USPS certified mail tracking, and public verification — designed for courts, compliance teams, and developers who need proof that holds up.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="mailto:hello@mailmypdf.com?subject=Proof-of-Service%20Enterprise%20Inquiry"
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
              >
                Request API Access
              </a>
              <a
                href="#api"
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
              >
                API Reference
              </a>
              <Link
                to="/verify"
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Verification Portal →
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <CheckIcon /> SHA-256 document hashing
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> Hash-chained custody events
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> USPS certified mail tracking
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon /> Public verification — no login
              </span>
            </div>
          </div>

          {/* Right: visual proof card */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 blur-2xl" />
            <div
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl backdrop-blur-sm"
              style={{ animation: "pos-float 6s ease-in-out infinite" }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-400">Proof Bundle</span>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Verified</span>
                </div>
              </div>

              <div className="my-4 h-px bg-slate-700" />

              <div className="space-y-3.5">
                <ProofField label="Tracking" value="9407 1899 9234 5678 9100 23" mono />
                <ProofField label="SHA-256" value="a3f5b8c1d2e4f6a7b9c8..." mono />
                <ProofField label="Status" value="Delivered" badge="emerald" />
                <ProofField label="Sent" value="Aug 1, 2026 14:30 UTC" />
                <ProofField label="Delivered" value="Aug 3, 2026 11:22 UTC" />
                <ProofField label="Mail Type" value="USPS Certified" />
              </div>

              <div className="my-4 h-px bg-slate-700" />

              <div className="text-xs text-slate-500">
                <span className="font-mono uppercase tracking-wider text-slate-400">Custody Chain</span>
                <div className="mt-2 flex items-center gap-2">
                  <ChainStep label="created" active />
                  <ChainArrow />
                  <ChainStep label="sent" active />
                  <ChainArrow />
                  <ChainStep label="delivered" active />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <ShieldCheckIcon />
                <span className="text-xs text-emerald-300">
                  Hash chain intact · Independently verifiable
                </span>
              </div>
            </div>

            <div className="absolute -right-3 -top-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-[10px] text-slate-400 shadow-lg" style={{ animation: "pos-float 6s ease-in-out infinite", animationDelay: "0.5s" }}>
              SHA-256 ✓
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofField({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
      {badge ? (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge === "emerald" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-300"}`}>
          {value}
        </span>
      ) : (
        <span className={`text-sm ${mono ? "font-mono text-slate-300" : "text-slate-200"}`}>{value}</span>
      )}
    </div>
  );
}

function ChainStep({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700 text-slate-500"}`}>
      {label}
    </span>
  );
}

function ChainArrow() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="text-slate-600">
      <path d="M1 4h8m0 0L6 1m3 3L6 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ------------------------------------------------------------- Trust Bar */
function TrustBar() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-6 text-sm text-slate-500">
          <span className="font-medium text-slate-700">Built on</span>
          <div className="flex flex-wrap items-center gap-8">
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Lob API
            </span>
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="3" width="15" height="13" rx="2" />
                <path d="M16 8h4l3 3v5h-7" />
              </svg>
              USPS Certified Mail
            </span>
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              SHA-256 Hashing
            </span>
            <span className="flex items-center gap-2 font-medium text-slate-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Hash-Chained Custody
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- What It Does */
function WhatItDoes() {
  const pillars = [
    {
      icon: <HashIcon />,
      title: "Document Hashing",
      desc: "Every document gets a SHA-256 hash computed server-side at upload. The hash is stored, chained into custody events, and included in the proof bundle — so any party can independently verify the document hasn't been altered.",
    },
    {
      icon: <ChainIcon />,
      title: "Hash-Chained Custody Events",
      desc: "Each custody event (created, sent, in-transit, delivered, returned) is cryptographically linked to the prior event via a hash chain. Tampering with any event breaks the chain and is immediately detectable by any verifier.",
    },
    {
      icon: <TrackIcon />,
      title: "USPS Tracking Integration",
      desc: "Certified mail tracking numbers, delivery scans, and electronic return receipts are captured from Lob/USPS webhook events and bound to the communication record in real time — no manual data entry.",
    },
    {
      icon: <ShieldIcon />,
      title: "Public Proof Bundles",
      desc: "A judge, auditor, or opposing counsel verifies a proof bundle by tracking number and document hash. No login, no tenant data, no recipient PII, no legal strategy exposed — just the verifiable facts of the send and delivery.",
    },
  ];

  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">What it does</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Four pillars of verifiable delivery.
          </h2>
          <p className="mt-4 text-slate-600">
            We don't just send mail and hand you a tracking number. Every step — from document
            upload to final delivery scan — is cryptographically bound and independently verifiable
            by any third party.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                {p.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- How It Works */
function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Create a Tenant",
      desc: "Onboard your organization with an API key. Configure webhooks for delivery events. Optionally provide your own Lob API key for per-tenant isolation.",
      code: `POST /api/v1/tenants
Authorization: Bearer <platform-key>
Content-Type: application/json

{
  "name": "Humboldt County Code Enforcement",
  "webhook_url": "https://api.example-tenant.gov/webhooks/pos",
  "lob_api_key": "live_..." // optional: per-tenant Lob key
}`,
    },
    {
      step: "02",
      title: "Upload a Document",
      desc: "Send a PDF (multipart or base64). We compute the SHA-256 hash server-side and return it for your independent verification.",
      code: `POST /api/v1/documents
Authorization: Bearer <tenant-api-key>
Content-Type: multipart/form-data

file=@notice-of-violation.pdf

→ 201 Created
{
  "document_id": "doc_a3f5b8c1d2e4",
  "sha256": "a3f5b8c1d2e4f6a7...",
  "size_bytes": 84729,
  "page_count": 3
}`,
    },
    {
      step: "03",
      title: "Send the Communication",
      desc: "Specify the document, recipient address, mail type, and legal reference (statute, cure period, response window). We send via Lob/USPS certified mail and create the custody chain.",
      code: `POST /api/v1/communications
Authorization: Bearer <tenant-api-key>
Content-Type: application/json

{
  "document_id": "doc_a3f5b8c1d2e4",
  "recipient": {
    "name": "Property Owner",
    "address_line1": "500 Market St",
    "city": "Eureka", "state": "CA", "zip": "95501"
  },
  "mail_type": "certified",
  "legal_reference": {
    "citation": "[JURISDICTION-SPECIFIC CODE SECTION]",
    "description": "Notice of violation",
    "response_window_days": 30
  }
}

→ 201 Created
{
  "communication_id": "comm_7f8a2b...",
  "tracking_number": "9405511899599...",
  "status": "sent",
  "custody_chain": [{ "event_type": "created" }, ...]
}`,
    },
    {
      step: "04",
      title: "Track & Verify",
      desc: "Lob/USPS webhook events update the custody chain in real time. When delivered, any third party can verify the proof bundle — no login, no account, no tenant data exposed.",
      code: `GET /api/v1/verify/9405511899599...
    ?document_hash=a3f5b8c1d2e4f6a7...

→ 200 OK
{
  "verified": true,
  "tracking_number": "9405511899599...",
  "carrier": "usps",
  "mail_type": "certified",
  "status": "delivered",
  "sent_at": "2026-08-01T14:30:00Z",
  "delivered_at": "2026-08-03T11:22:00Z",
  "document_sha256": "a3f5b8c1d2e4f6a7...",
  "legal_citation": "[JURISDICTION-SPECIFIC CODE SECTION]",
  "response_window_ends": "2026-09-02T14:30:00Z",
  "custody_chain": [
    { "event_type": "created", "timestamp": "...",
      "event_hash": "e1a2b3...", "prior_event_hash": null },
    { "event_type": "sent", "timestamp": "...",
      "event_hash": "f2b3c4...", "prior_event_hash": "e1a2b3..." },
    { "event_type": "delivered", "timestamp": "...",
      "event_hash": "g3c4d5...", "prior_event_hash": "f2b3c4..." }
  ]
}`,
    },
    {
      step: "05",
      title: "Verify the Proof",
      desc: "Any third party \u2014 judge, auditor, opposing counsel \u2014 verifies the proof bundle without an account. The public endpoint returns only delivery facts: tracking, timestamps, custody chain, and document hash. No PII, no tenant data.",
      code: `// Public verification \u2014 no auth required
GET /api/v1/verify/9405511899599...
    ?document_hash=a3f5b8c1d2e4f6a7...

\u2192 200 OK
{
  "verified": true,
  "status": "delivered",
  "document_sha256": "a3f5b8c1d2e4...",
  "custody_chain": [
    { "event": "created",   "hash": "e1a2b3..." },
    { "event": "sent",      "hash": "f2b3c4..." },
    { "event": "delivered",  "hash": "g3c4d5..." }
  ],
  "hash_chain_intact": true
}`,
    },
  ];

  return (
    <section id="how-it-works" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">How it works</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Five steps, end to end.
          </h2>
        </div>
        <div className="mt-12 space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl text-slate-400">{s.step}</span>
                  <h3 className="text-xl font-semibold text-slate-900">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-xs text-slate-400">API Request</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-300">
                  {s.code}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- API Endpoints */
function APIEndpoints() {
  const endpoints = [
    { method: "POST", path: "/api/v1/tenants", desc: "Create a tenant and get an API key (shown once)", auth: "Platform key" },
    { method: "POST", path: "/api/v1/documents", desc: "Upload a document, get SHA-256 hash + document ID", auth: "Tenant API key", rate: true },
    { method: "GET", path: "/api/v1/documents/:id", desc: "Retrieve document metadata (not content)", auth: "Tenant API key" },
    { method: "POST", path: "/api/v1/communications", desc: "Create and send a communication via Lob/USPS", auth: "Tenant API key", rate: true },
    { method: "GET", path: "/api/v1/communications/:id", desc: "Get communication status, custody events, tracking", auth: "Tenant API key" },
    { method: "GET", path: "/api/v1/communications/:id/proof", desc: "Download the full proof bundle (hash chain + custody events)", auth: "Tenant API key" },
    { method: "GET", path: "/api/v1/communications", desc: "List communications with pagination", auth: "Tenant API key" },
    { method: "POST", path: "/api/v1/templates", desc: "Create a reusable document template", auth: "Tenant API key" },
    { method: "POST", path: "/api/v1/templates/:id/render", desc: "Render a template with variables to produce a document", auth: "Tenant API key" },
    { method: "GET", path: "/api/v1/verify/:trackingNumber", desc: "Public verification — no auth, no PII, just the facts", auth: "Public", rate: true },
    { method: "POST", path: "/api/public/lob-webhook", desc: "Unified webhook for Lob delivery events", auth: "Webhook signature" },
  ];

  return (
    <section id="api" className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">API Reference</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Twelve endpoints. Full coverage.
          </h2>
          <p className="mt-4 text-slate-600">
            Onboard, upload documents, send certified mail, track delivery, and generate
            verifiable proof bundles. RESTful, JSON, per-tenant API keys.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Method</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Endpoint</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Description</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Auth</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e, i) => (
                <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} transition-colors hover:bg-blue-50/40`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${
                      e.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-700"
                    }`}>
                      {e.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">{e.path}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.desc}
                    {e.rate && (
                      <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                        rate-limited
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{e.auth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          All endpoints return JSON. Rate limits are per-tenant and configurable. Full OpenAPI
          specification available on request.
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Verticals */
function Verticals() {
  const verticals = [
    {
      title: "Code Enforcement",
      desc: "Notices of violation, abatement orders, reinspection scheduling. Track compliance deadlines and prove service to the property owner.",
      example: "Local code violations, nuisance abatement, administrative citations",
      disclaimer: false,
    },
    {
      title: "Landlord-Tenant",
      desc: "Eviction notices, cure-or-quit notices, rent demands. Varying notice periods by state and county — the API binds each send to the specific statutory requirement.",
      example: "3-day pay-or-quit, 30-day notice, 60-day termination",
      disclaimer: false,
    },
    {
      title: "FDCPA Debt Collection",
      desc: "Validation notices, dispute notices, cease-and-desist confirmations. Reg F governs content and timing strictly — our API proves delivery, not Reg F compliance.",
      example: "1692g validation notices, 1692c cease-and-desist confirmations",
      disclaimer: true,
    },
    {
      title: "HOA Liens & Assessments",
      desc: "Assessment notices, lien claims, hearing notices. State-specific delivery requirements for liens and foreclosures.",
      example: "CC&R notice of assessment, notice of lien, hearing notice",
      disclaimer: false,
    },
    {
      title: "Insurance Non-Renewal",
      desc: "Non-renewal notices, cancellation notices, policy changes. Statutory notice periods vary by state — we prove the notice was sent within the required window.",
      example: "45-day non-renewal notice, 10-day cancellation notice",
      disclaimer: false,
    },
    {
      title: "Custom Workflows",
      desc: "Any notice that needs cryptographic proof of delivery. The API is vertical-agnostic — bring your own legal requirements and we provide the proof infrastructure.",
      example: "Contract notices, regulatory filings, shareholder communications",
      disclaimer: false,
    },
  ];

  return (
    <section id="verticals" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">Built for</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Every notice that needs proof.
          </h2>
          <p className="mt-4 text-slate-600">
            We provide the infrastructure that proves you delivered. Each vertical has its own
            statutory requirements, notice periods, and evidentiary standards. You bring the legal
            requirements; we provide the proof.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v) => (
            <div key={v.title} className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
              <h3 className="text-base font-semibold text-slate-900">{v.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{v.desc}</p>
              <div className="mt-4 border-t border-slate-100 pt-3 font-mono text-[11px] text-slate-400">
                {v.example}
              </div>
              {v.disclaimer && (
                <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Proof of delivery only — not Reg F compliance verification.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Pricing */
function Pricing() {
  return (
    <section id="pricing" className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">Pricing</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Volume-based. Enterprise-ready.
          </h2>
          <p className="mt-4 text-slate-600">
            Per-communication pricing that scales down as volume goes up. Enterprise plans include
            dedicated onboarding, custom MSA, invoicing, and SLA guarantees.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Starter */}
          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Starter</h3>
            <div className="mt-4 text-3xl font-semibold text-slate-900">$3.99</div>
            <p className="text-sm text-slate-500">per certified communication</p>
            <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <ul className="space-y-2">
                <li className="flex items-start gap-2"><CheckIcon /> API access with 1 tenant</li>
                <li className="flex items-start gap-2"><CheckIcon /> All 11 endpoints</li>
                <li className="flex items-start gap-2"><CheckIcon /> Standard rate limits</li>
                <li className="flex items-start gap-2"><CheckIcon /> Email support</li>
              </ul>
            </div>
            <p className="mt-4 text-xs text-slate-400">Up to 100 communications/month</p>
          </div>

          {/* Professional */}
          <div className="relative flex flex-col rounded-lg border-2 border-slate-900 bg-white p-6 transition-all hover:shadow-lg">
            <div className="absolute -top-3 left-6 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Recommended
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Professional</h3>
            <div className="mt-4 text-3xl font-semibold text-slate-900">$2.49</div>
            <p className="text-sm text-slate-500">per certified communication</p>
            <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <ul className="space-y-2">
                <li className="flex items-start gap-2"><CheckIcon /> Everything in Starter</li>
                <li className="flex items-start gap-2"><CheckIcon /> Custom rate limits</li>
                <li className="flex items-start gap-2"><CheckIcon /> Per-tenant Lob API keys</li>
                <li className="flex items-start gap-2"><CheckIcon /> Webhook delivery + retries</li>
                <li className="flex items-start gap-2"><CheckIcon /> Priority support</li>
              </ul>
            </div>
            <p className="mt-4 text-xs text-slate-400">100 — 5,000 communications/month</p>
          </div>

          {/* Enterprise */}
          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Enterprise</h3>
            <div className="mt-4 text-3xl font-semibold text-slate-900">Custom</div>
            <p className="text-sm text-slate-500">volume-based pricing</p>
            <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <ul className="space-y-2">
                <li className="flex items-start gap-2"><CheckIcon /> 50,000+ notices/month</li>
                <li className="flex items-start gap-2"><CheckIcon /> 99.99% uptime SLA</li>
                <li className="flex items-start gap-2"><CheckIcon /> Immutable audit trail</li>
                <li className="flex items-start gap-2"><CheckIcon /> SOC 2 roadmap + DPA</li>
                <li className="flex items-start gap-2"><CheckIcon /> Dedicated onboarding</li>
                <li className="flex items-start gap-2"><CheckIcon /> Custom MSA + invoicing</li>
              </ul>
            </div>
            <p className="mt-4 text-xs text-slate-400">5,000+ communications/month</p>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          All plans include USPS certified mail, tracking, electronic return receipt, and full
          custody chain. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Security */
function SecuritySection() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-sm font-semibold text-blue-600">Security & Data Retention</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Where your documents live, and for how long.
          </h2>
          <p className="mt-4 text-slate-600">
            A compliance officer evaluating this product will ask two questions before anything
            else: where does the PDF live, and how long do you keep it. Here are the answers.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <SecurityCard
            icon={<LockIcon />}
            title="Encryption at Rest"
            desc="Document files are encrypted at rest in Cloudflare R2 storage. Database records (Supabase/PostgreSQL) are encrypted at rest with AES-256. All transit is TLS 1.3."
          />
          <SecurityCard
            icon={<KeyIcon />}
            title="Per-Tenant Isolation"
            desc="Each tenant gets isolated API keys, isolated Lob credentials, and row-level security (RLS) in the database. One tenant cannot access another tenant's documents, communications, or custody chains."
          />
          <SecurityCard
            icon={<ClockIcon />}
            title="Configurable Retention"
            desc="Default retention is 7 years from delivery date, matching standard legal records requirements. Enterprise tenants can configure shorter or longer retention periods. Documents are securely deleted after retention expiry."
          />
          <SecurityCard
            icon={<EyeIcon />}
            title="Audit Logging"
            desc="Every API call, document access, and custody event is logged with timestamp, tenant ID, and IP address. Enterprise plans include exportable audit logs for compliance reviews."
          />
          <SecurityCard
            icon={<ShieldIcon />}
            title="No PII in Verification"
            desc="The public verification endpoint exposes only delivery facts — tracking number, status, timestamps, custody chain, and document hash. No recipient name, address, or tenant information is returned to public callers."
          />
          <SecurityCard
            icon={<CertificateIcon />}
            title="Compliance Roadmap"
            desc="SOC 2 Type II audit is on the roadmap. Data Processing Agreement (DPA) available for Enterprise tenants. We do not train models on customer documents."
          />
        </div>
        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Need a security review?</span> We provide
            architecture documentation, data flow diagrams, and a DPA template for Enterprise
            tenants. Contact us at{" "}
            <a href="mailto:hello@mailmypdf.com?subject=Proof-of-Service%20Security%20Review" className="font-medium text-blue-600 hover:text-blue-700">
              hello@mailmypdf.com
            </a>.
          </p>
        </div>
      </div>
    </section>
  );
}

function SecurityCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

/* ------------------------------------------------------- Compliance */
function ComplianceSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="text-sm font-semibold text-blue-600">Compliance & Legal</div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
          What we prove. What we don't.
        </h2>
        <p className="mt-4 text-slate-600">
          We want to be crystal clear about the boundary of our product. Proof-of-Service proves
          that a notice was sent, delivered, and received. It does not — and cannot — verify that
          your notice content, timing, or format complies with any specific statute or regulation.
        </p>
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">What we prove</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CheckIcon /> The document was uploaded and hashed at a specific timestamp</li>
              <li className="flex items-start gap-2"><CheckIcon /> Certified mail was sent via USPS with a specific tracking number</li>
              <li className="flex items-start gap-2"><CheckIcon /> The mailpiece was delivered (or returned) on a specific date</li>
              <li className="flex items-start gap-2"><CheckIcon /> The custody chain is intact and untampered (hash verification)</li>
              <li className="flex items-start gap-2"><CheckIcon /> The document hash matches what was sent (content integrity)</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="text-base font-semibold text-slate-900">What we do not verify</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CrossIcon /> Whether your notice content satisfies any statute or regulation</li>
              <li className="flex items-start gap-2"><CrossIcon /> Whether your notice was sent within a required statutory window</li>
              <li className="flex items-start gap-2"><CrossIcon /> Whether your notice format meets jurisdiction-specific requirements</li>
              <li className="flex items-start gap-2"><CrossIcon /> Whether the recipient was the correct party to serve</li>
              <li className="flex items-start gap-2"><CrossIcon /> Whether your overall process complies with any legal standard</li>
            </ul>
          </div>
          <ComplianceDisclaimer vertical="FDCPA" />
          <p className="text-sm text-slate-500">
            Each vertical — code enforcement, landlord-tenant, FDCPA, HOA, insurance — has its own
            statutory requirements that govern notice content, timing, format, and delivery method.
            Proof-of-Service provides the evidentiary infrastructure. You and your legal counsel
            are responsible for ensuring compliance with applicable law.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Final CTA */
function FinalCTA() {
  return (
    <section className="relative border-b border-slate-200 bg-slate-900 text-white"
      style={{ backgroundImage: "radial-gradient(circle at 25% 25%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99,102,241,0.06) 0%, transparent 50%)" }}>
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Ready to prove your notices?
        </h2>
        <p className="mt-4 text-slate-300">
          Contact our team to discuss API access, enterprise pricing, and onboarding for your
          organization. We'll set up a tenant, configure your webhooks, and get you sending
          verifiable certified mail within a day.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:hello@mailmypdf.com?subject=Proof-of-Service%20Enterprise%20Inquiry"
            className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100 hover:-translate-y-0.5"
          >
            Contact Sales
          </a>
          <Link
            to="/verify"
            className="inline-flex items-center rounded-md border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-0.5"
          >
            Try the Verification Portal
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Icons */
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 6.5m0 0l3 3L22 6l-3-3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15c-1.5 0-3 .5-3 3v3h6v-3c0-2.5-1.5-3-3-3z" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M9 2h6l2 4-2 4H9L7 6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function TrackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
