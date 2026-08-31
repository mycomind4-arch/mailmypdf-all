import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CANONICAL_WORKFLOW_CARDS, GENERAL_WORKFLOW_CARDS } from "@/lib/homepage-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immigration Mail — Prepare and mail important immigration correspondence" },
      { name: "description", content: "Tell us what happened. We'll figure out what you need, prepare your correspondence, and mail it via USPS with tracking and proof of delivery. Not a law firm." },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Immigration Mail",
          description: "Prepare and mail important immigration correspondence with guided workflows, AI-assisted drafting, and physical mail with proof of delivery.",
          areaServed: "US",
          offers: [
            { "@type": "Offer", name: "Standard mail (1-2 pages)", price: "4.99", priceCurrency: "USD" },
            { "@type": "Offer", name: "Certified mail (1-2 pages)", price: "14.94", priceCurrency: "USD" },
            { "@type": "Offer", name: "Registered mail (1-2 pages)", price: "32.49", priceCurrency: "USD" },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <Hero />
      <TrustStrip />
      <SpecializedWorkflows />
      <GeneralWorkflows />
      <HowItWorks />
      <DocumentIntelligence />
      <Pricing />
      <Privacy />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function ArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}
function CheckIcon() {
  return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}

/* ── Hero ─────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Premium hero image on the right, editorial layout */}
      <div className="mx-auto grid max-w-6xl gap-0 px-4 sm:px-6 md:grid-cols-[1.15fr_1fr]">
        {/* Left: Headline + CTAs */}
        <div className="flex flex-col justify-center py-10 sm:py-16 md:py-24 md:pr-10">
          <div className="eyebrow">Immigration correspondence</div>
          <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl md:text-6xl md:leading-[1.03]" data-testid="concierge-headline">
            Prepare your immigration correspondence with confidence.
          </h1>
          <p className="mt-5 max-w-lg text-base text-ink-soft sm:text-lg">
            Turn complicated immigration matters into organized, documented action.
            Build your correspondence, review before sending, and mail with proof of delivery.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            No account required · Private &amp; secure · Not a law firm — you control the facts
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/workflows/respond-to-notice"
              className="btn-primary text-base"
              data-testid="cta-start-conversation"
            >
              Start a Case <ArrowRight />
            </Link>
            <Link
              to="/workflows"
              className="btn-secondary"
            >
              Explore Immigration Workflows
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckIcon /> Document-focused</span>
            <span className="flex items-center gap-1.5"><CheckIcon /> Private by design</span>
            <span className="flex items-center gap-1.5"><CheckIcon /> Review before sending</span>
            <span className="flex items-center gap-1.5"><CheckIcon /> Professional mailing</span>
          </div>
        </div>

        {/* Right: Hero image */}
        <div className="relative hidden md:block">
          <div className="absolute inset-0 -mr-6 lg:-mr-10">
            <img
              src="/img/hero.jpg"
              alt="A private immigration document office with organized case folders and warm ivory documents"
              className="h-full w-full rounded-l-2xl object-cover"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Mobile hero image */}
      <div className="md:hidden px-4 pb-6">
        <img
          src="/img/hero.jpg"
          alt="A private immigration document office with organized case folders and warm ivory documents"
          className="h-64 w-full rounded-xl object-cover"
          loading="eager"
        />
      </div>
    </section>
  );
}

/* ── Trust Strip ──────────────────────────────────────────────────────── */
function TrustStrip() {
  const items = [
    { label: "Private", icon: "M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7l8-4z" },
    { label: "Organized", icon: "M5 3h10l4 4v14H5V3zM9 7h6M9 11h6M9 15h4" },
    { label: "Reviewable", icon: "M12 6v6l4 2M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" },
    { label: "Trackable", icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  ];
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-paper-deep">
                <svg className="h-4 w-4 text-brass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </span>
              <span className="text-sm font-medium text-ink-soft">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Specialized Workflows ────────────────────────────────────────────── */
function SpecializedWorkflows() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow">Immigration workflows</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Find the workflow that matches your situation</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Each workflow guides you through organizing documents, building correspondence, reviewing, and mailing.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CANONICAL_WORKFLOW_CARDS.map((w) => (
            <Link key={w.route} to={w.route} className="envelope-card envelope-card-hover p-5 sm:p-6 block">
              {w.badge && <div className="eyebrow">{w.badge}</div>}
              <h3 className="mt-2 font-serif text-xl">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{w.purpose}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brass">
                Start <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── General Workflows ────────────────────────────────────────────────── */
function GeneralWorkflows() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow">General starting points</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Not sure which workflow you need?</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Start with a general workflow and we'll guide you from there.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {GENERAL_WORKFLOW_CARDS.map((w) => (
            <Link key={w.route} to={w.route} className="envelope-card envelope-card-hover p-5 sm:p-6 block">
              <h3 className="font-serif text-xl">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{w.purpose}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brass">
                Start <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ─────────────────────────────────────────────────────── */
const STEPS = [
  { n: "01", t: "Choose your workflow", d: "Select the workflow that matches your notice, request, or situation." },
  { n: "02", t: "Organize your documents", d: "Upload notices, identify deadlines, and map what evidence you need." },
  { n: "03", t: "Build your correspondence", d: "We help draft a professional letter from your facts. Everything is editable." },
  { n: "04", t: "Review and approve", d: "Review every word. Nothing is mailed until you approve the final version." },
  { n: "05", t: "Mail and track", d: "Choose Standard, Certified, or Registered mail. We print, envelope, and send via USPS." },
];

function HowItWorks() {
  return (
    <section id="how" className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <div className="eyebrow">Process</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">How Immigration Mail works</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3 sm:mt-10">
          {STEPS.map((s) => (
            <div key={s.n} className="envelope-card p-5 sm:p-6">
              <div className="font-mono text-xs text-brass">{s.n}</div>
              <div className="mt-3 font-serif text-xl sm:text-2xl">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Document Intelligence ──────────────────────────────────────────────── */
function DocumentIntelligence() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="eyebrow">Document intelligence</div>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">
              What does this <span className="italic text-brass">letter</span> mean?
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              Upload any immigration document — a notice, letter, or decision — and get a
              plain-English explanation of what it is, what it says, and what you should do next.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Our AI identifies the document type, extracts deadlines and requested actions,
              and flags anything you need to verify.
            </p>
            <Link to="/analyze" className="btn-primary mt-6">
              Try document analysis <ArrowRight />
            </Link>
          </div>

          <div className="relative">
            <div className="envelope-card relative p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">Identified</div>
                  <h3 className="mt-2 font-serif text-xl">Request for Evidence</h3>
                  <p className="text-xs text-muted-foreground">USCIS · Texas Service Center</p>
                </div>
                <span className="badge-base badge-brass">RFE</span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { l: "Document type", v: "Request for Evidence (RFE)" },
                  { l: "Issuing agency", v: "USCIS" },
                  { l: "Response deadline", v: "Oct 15, 2026 — 87 days", urgent: true },
                  { l: "Requested items", v: "Medical I-693, proof of status" },
                ].map((row) => (
                  <div key={row.l} className="flex items-start justify-between gap-3 border-b border-rule/40 pb-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{row.l}</span>
                    <span className={`text-right text-sm font-medium ${row.urgent ? "text-brass" : "text-foreground"}`}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="alert alert-info mt-4">
                <span className="font-mono uppercase tracking-widest text-brass text-xs">Next step</span>
                <p className="mt-1">Gather the requested documents and prepare your response within 87 days.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────────── */
const PRICING = [
  { type: "Standard", price: `$${(PRICES.standard / 100).toFixed(2)}`, desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"] },
  { type: "Certified", price: `$${(PRICES.certified / 100).toFixed(2)}`, desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], featured: true },
  { type: "Registered", price: `$${(PRICES.registered / 100).toFixed(2)}`, desc: "Highest security for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"] },
];

function Pricing() {
  return (
    <section id="pricing" className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <div className="eyebrow">Pricing</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Pay per mailing. No subscription.</h2>
          <p className="mt-4 text-sm text-muted-foreground sm:text-base">
            Prices include printing, paper, envelope, and postage. Page-count tiers apply.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3 sm:mt-10">
          {PRICING.map((p) => (
            <div key={p.type} className={`envelope-card p-5 sm:p-6 ${p.featured ? "ring-1 ring-brass/40" : ""}`}>
              {p.featured && <div className="eyebrow mb-2">Recommended</div>}
              <h3 className="font-serif text-2xl">{p.type}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-4 text-3xl font-serif">{p.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-ink-soft">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon /><span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/workflows/respond-to-notice" className={`mt-6 w-full ${p.featured ? "btn-primary" : "btn-secondary"}`}>
                Choose {p.type}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Privacy ──────────────────────────────────────────────────────────── */
function Privacy() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="eyebrow">Private by design</div>
            <h3 className="mt-3 font-serif text-xl">Your documents stay yours</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Documents are stored securely, never shared, and never used for marketing or AI training.
            </p>
          </div>
          <div>
            <div className="eyebrow">Reviewable</div>
            <h3 className="mt-3 font-serif text-xl">You approve every word</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing is mailed until you review and approve the final correspondence. AI suggestions are clearly labeled.
            </p>
          </div>
          <div>
            <div className="eyebrow">Honest about scope</div>
            <h3 className="mt-3 font-serif text-xl">Not a law firm</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Immigration Mail organizes documents and prepares correspondence. It does not provide legal advice or representation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────────────────────── */
const FAQS = [
  { q: "Is Immigration Mail a law firm?", a: "No. Immigration Mail provides document preparation and mailing tools. It does not provide legal advice or representation. Users are responsible for reviewing their documents and verifying requirements." },
  { q: "Can I review my correspondence before it's mailed?", a: "Yes. Every workflow is designed so you review and approve the final correspondence before a mailing is created. Nothing is sent without your approval." },
  { q: "How does mailing work?", a: "We print, envelope, and mail your correspondence via USPS. Choose Standard, Certified, or Registered mail. All options include tracking, and Certified mail adds proof of delivery." },
  { q: "Is my data secure?", a: "Documents are stored securely and never shared with third parties. We do not use your documents for marketing or AI training." },
];

function FAQ() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Common questions</h2>
        </div>
        <div className="mt-6 space-y-4">
          {FAQS.map((item) => (
            <details key={item.q} className="envelope-card p-5 sm:p-6 group">
              <summary className="flex cursor-pointer items-center justify-between font-serif text-lg text-foreground">
                {item.q}
                <span className="text-brass transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ───────────────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-rule">
          <img src="/img/office-interior.jpg" alt="A private client office with organized document folders" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="relative bg-navy/85 px-6 py-14 sm:px-10 sm:py-20 md:px-16">
            <h2 className="max-w-lg text-3xl text-paper sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
              Ready to prepare your correspondence?
            </h2>
            <p className="mt-4 max-w-md text-sm text-paper/70 sm:text-base">
              Start with the workflow that matches your situation. No account required to begin.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/workflows/respond-to-notice" className="btn-primary text-base">
                Start a Case <ArrowRight />
              </Link>
              <Link to="/workflows" className="btn-secondary bg-paper/10 border-paper/20 text-paper hover:bg-paper/20">
                Browse Workflows
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
