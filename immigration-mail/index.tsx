import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CANONICAL_WORKFLOW_CARDS, GENERAL_WORKFLOW_CARDS } from "@/lib/homepage-data";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

const VerticalHero = createVerticalHero(createElement);
const SharedTrustStrip = createTrustStrip(createElement);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immigration Mail — Prepare and mail important immigration correspondence" },
      { name: "description", content: "Prepare immigration correspondence with guided workflows, review before sending, and optional MailMyPDF mailing with tracking and proof." },
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
            { "@type": "Offer", name: "Standard mail", price: (PRICES.standard / 100).toFixed(2), priceCurrency: "USD" },
            { "@type": "Offer", name: "Certified mail", price: (PRICES.certified / 100).toFixed(2), priceCurrency: "USD" },
            { "@type": "Offer", name: "Registered mail", price: (PRICES.registered / 100).toFixed(2), priceCurrency: "USD" },
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
      <VerticalHero
        theme="immigration-mail"
        tone="dark"
        eyebrow="Prepare. Submit. Move forward."
        title="Prepare your immigration correspondence with confidence."
        description="Prepare and send USCIS forms, responses, and supporting correspondence with guided workflows, clear review steps, and optional MailMyPDF mailing."
        imageSrc="/ecosystem-hero-sprite.jpg"
        imageAlt="Statue of Liberty representing immigration correspondence"
        imageBackgroundSize="200% 300%"
        imageBackgroundPosition="0% 50%"
        actions={
          <>
            <Link to="/workflows/respond-to-notice" className="btn-primary text-base" data-testid="cta-start-conversation">
              Start an Immigration Workflow <ArrowRight />
            </Link>
            <Link to="/workflows" className="btn-secondary">Find Your Workflow</Link>
          </>
        }
        meta={<><span>Document-focused guidance</span><span>Review before sending</span><span>Optional physical mailing</span></>}
      />
      <SharedTrustStrip
        items={[
          { icon: <CheckIcon />, title: "No printer required", description: "Prepare and mail online" },
          { icon: <CheckIcon />, title: "Form-specific guidance", description: "Start from your notice or objective" },
          { icon: <CheckIcon />, title: "You approve before mailing", description: "Review the exact correspondence" },
          { icon: <CheckIcon />, title: "Tracking & proof available", description: "Keep the mailing record together" },
        ]}
      />
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

function ArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}
function CheckIcon() {
  return <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}

function SpecializedWorkflows() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow">Immigration workflows</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Find the workflow that matches your situation</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">Each workflow guides you through organizing documents, building correspondence, reviewing, and mailing.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CANONICAL_WORKFLOW_CARDS.map((w) => (
            <Link key={w.route} to={w.route} className="envelope-card envelope-card-hover p-5 sm:p-6 block">
              {w.badge && <div className="eyebrow">{w.badge}</div>}
              <h3 className="mt-2 font-serif text-xl">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{w.purpose}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brass">Start <ArrowRight /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function GeneralWorkflows() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <div className="eyebrow">General starting points</div>
          <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Not sure which workflow you need?</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">Start with a general workflow and we'll guide you from there.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {GENERAL_WORKFLOW_CARDS.map((w) => (
            <Link key={w.route} to={w.route} className="envelope-card envelope-card-hover p-5 sm:p-6 block">
              <h3 className="font-serif text-xl">{w.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{w.purpose}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brass">Start <ArrowRight /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

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
        <div className="max-w-2xl"><div className="eyebrow">Process</div><h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">How Immigration Mail works</h2></div>
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3 sm:mt-10">
          {STEPS.map((s) => (
            <div key={s.n} className="envelope-card p-5 sm:p-6"><div className="font-mono text-xs text-brass">{s.n}</div><div className="mt-3 font-serif text-xl sm:text-2xl">{s.t}</div><p className="mt-2 text-sm text-muted-foreground">{s.d}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DocumentIntelligence() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="eyebrow">Document intelligence</div>
            <h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">What does this <span className="italic text-brass">letter</span> mean?</h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">Upload an immigration document — a notice, letter, or decision — and get a structured explanation of what it is, what it says, and what requires your review.</p>
            <p className="mt-3 text-sm text-muted-foreground">Document analysis can identify the document type, extract dates and requested actions, and flag information that needs verification.</p>
            <Link to="/analyze" className="btn-primary mt-6">Try document analysis <ArrowRight /></Link>
          </div>
          <div className="relative">
            <div className="envelope-card relative p-5 sm:p-6">
              <div className="flex items-start justify-between"><div><div className="eyebrow">Example analysis</div><h3 className="mt-2 font-serif text-xl">Request for Evidence</h3><p className="text-xs text-muted-foreground">Illustrative workflow preview</p></div><span className="badge-base badge-brass">RFE</span></div>
              <div className="mt-5 space-y-3">
                {[
                  { l: "Document type", v: "Request for Evidence (RFE)" },
                  { l: "Issuing agency", v: "USCIS" },
                  { l: "Response deadline", v: "Extracted from your notice", urgent: true },
                  { l: "Requested items", v: "Verified from uploaded document" },
                ].map((row) => (
                  <div key={row.l} className="flex items-start justify-between gap-3 border-b border-rule/40 pb-3"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{row.l}</span><span className={`text-right text-sm font-medium ${row.urgent ? "text-brass" : "text-foreground"}`}>{row.v}</span></div>
                ))}
              </div>
              <div className="alert alert-info mt-4"><span className="font-mono uppercase tracking-widest text-brass text-xs">Next step</span><p className="mt-1">Verify the extracted facts, then continue into the matching response workflow.</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PRICING = [
  { type: "Standard", price: `$${(PRICES.standard / 100).toFixed(2)}`, desc: "Standard delivery for non-urgent mail", features: ["3–7 business days", "USPS tracking included", "Professional printing & envelope", "Mailing record retained"] },
  { type: "Certified", price: `$${(PRICES.certified / 100).toFixed(2)}`, desc: "Trackable delivery with confirmation", features: ["3–7 business days", "Delivery tracking + confirmation", "Proof of delivery", "Mailing record retained"], featured: true },
  { type: "Registered", price: `$${(PRICES.registered / 100).toFixed(2)}`, desc: "Higher-assurance handling for sensitive documents", features: ["5–10 business days", "Secure handling + tracking", "Insured delivery", "Signature required"] },
];

function Pricing() {
  return (
    <section id="pricing" className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="max-w-2xl"><div className="eyebrow">Pricing</div><h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Pay per mailing. No subscription.</h2><p className="mt-4 text-sm text-muted-foreground sm:text-base">Prices include printing, paper, envelope, and postage. Page-count tiers apply.</p></div>
        <div className="mt-8 grid gap-4 sm:gap-5 md:grid-cols-3 sm:mt-10">
          {PRICING.map((p) => (
            <div key={p.type} className={`envelope-card p-5 sm:p-6 ${p.featured ? "ring-1 ring-brass/40" : ""}`}>
              {p.featured && <div className="eyebrow mb-2">Recommended</div>}<h3 className="font-serif text-2xl">{p.type}</h3><p className="mt-1 text-sm text-muted-foreground">{p.desc}</p><p className="mt-4 text-3xl font-serif">{p.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-ink-soft">{p.features.map((f) => <li key={f} className="flex items-start gap-2"><CheckIcon/><span>{f}</span></li>)}</ul>
              <Link to="/workflows/respond-to-notice" className={`mt-6 w-full ${p.featured ? "btn-primary" : "btn-secondary"}`}>Choose {p.type}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div><div className="eyebrow">Account-scoped</div><h3 className="mt-3 font-serif text-xl">Your workflow stays tied to your account</h3><p className="mt-2 text-sm text-muted-foreground">Uploaded documents and drafts remain associated with the workflow and account context that created them.</p></div>
          <div><div className="eyebrow">Reviewable</div><h3 className="mt-3 font-serif text-xl">You approve every word</h3><p className="mt-2 text-sm text-muted-foreground">Nothing is mailed until you review and approve the final correspondence. AI suggestions remain subject to your review.</p></div>
          <div><div className="eyebrow">Honest about scope</div><h3 className="mt-3 font-serif text-xl">Not a law firm</h3><p className="mt-2 text-sm text-muted-foreground">Immigration Mail organizes documents and prepares correspondence. It does not provide legal advice or representation.</p></div>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  { q: "Is Immigration Mail a law firm?", a: "No. Immigration Mail provides document preparation and mailing tools. It does not provide legal advice or representation. Users are responsible for reviewing their documents and verifying requirements." },
  { q: "Can I review my correspondence before it's mailed?", a: "Yes. Every workflow is designed so you review and approve the final correspondence before a mailing is created. Nothing is sent without your approval." },
  { q: "How does mailing work?", a: "We print, envelope, and mail your correspondence via USPS. Choose Standard, Certified, or Registered mail. Available tracking and proof depend on the selected mailing service." },
  { q: "How are my documents handled?", a: "Protected workflow access is tied to your MailMyPDF account and the document workflow. Review the platform's Security & Trust and privacy controls for current handling and retention details." },
];

function FAQ() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl"><div className="eyebrow">FAQ</div><h2 className="mt-3 text-2xl sm:text-3xl md:text-4xl">Common questions</h2></div>
        <div className="mt-6 space-y-4">{FAQS.map((item) => <details key={item.q} className="envelope-card p-5 sm:p-6 group"><summary className="flex cursor-pointer items-center justify-between font-serif text-lg text-foreground">{item.q}<span className="text-brass transition-transform group-open:rotate-45 text-2xl leading-none">+</span></summary><p className="mt-3 text-sm text-muted-foreground">{item.a}</p></details>)}</div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-rule">
          <img src="/img/office-interior.jpg" alt="A private client office with organized document folders" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="relative bg-navy/85 px-6 py-14 sm:px-10 sm:py-20 md:px-16">
            <h2 className="max-w-lg text-3xl text-paper sm:text-4xl md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Ready to prepare your correspondence?</h2>
            <p className="mt-4 max-w-md text-sm text-paper/70 sm:text-base">Start with the workflow that matches your situation, review the correspondence, and choose mailing when you're ready.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link to="/workflows/respond-to-notice" className="btn-primary text-base">Start a Case <ArrowRight /></Link><Link to="/workflows" className="btn-secondary bg-paper/10 border-paper/20 text-paper hover:bg-paper/20">Browse Workflows</Link></div>
          </div>
        </div>
      </div>
    </section>
  );
}
