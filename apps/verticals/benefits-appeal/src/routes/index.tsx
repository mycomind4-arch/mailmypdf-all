import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Eye,
  Mail,
  PackageCheck,
  FileSearch,
  FolderOpen,
  Lightbulb,
  FileText,
  CheckCircle2,
  Lock,
  Stamp,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { APPEAL_CATALOG, CATEGORY_ORDER } from "@/domain/appeal-catalog";

const SITE_ORIGIN = "https://benefits-appeal.pages.dev";
const HERO_IMAGE = "https://media.base44.com/images/public/6a809b7aafbdc570968ab450/90fe8a0aa_generated_image.png";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Benefits Appeal — Understand the Decision. Build the Appeal. Mail It." },
      { name: "description", content: "Understand benefits denials, organize evidence, build supported appeals, and mail them with proof of delivery. Appeal SSDI, SSI, unemployment, Medicaid, SNAP, VA, and housing denials. A MailMyPDF product." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Benefits Appeal — Understand the Decision. Build the Appeal. Mail It." },
      { property: "og:description", content: "Analyze benefits denials, organize evidence, build supported appeals, and send with proof of delivery. A MailMyPDF product." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Benefits Appeal" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: HERO_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Benefits Appeal — Understand the Decision. Build the Appeal. Mail It." },
      { name: "twitter:description", content: "Analyze benefits denials, organize evidence, build supported appeals, and send with proof of delivery." },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Benefits Appeal",
          description: "Specialized workflows for appealing denied government benefits: SSDI, SSI, unemployment, Medicaid, SNAP, VA, housing, and disability benefits.",
          url: SITE_ORIGIN,
          publisher: { "@type": "Organization", name: "MailMyPDF" },
          hasPart: Object.values(workflows).map((workflow) => ({
            "@type": "WebPage",
            name: workflow.title,
            url: SITE_ORIGIN + "/workflows/" + workflow.id,
            about: workflow.primaryKeyword || workflow.title,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Benefits Appeal",
          serviceType: "Benefits appeal letter preparation and mailing",
          provider: { "@type": "Organization", name: "MailMyPDF" },
          description: "Upload a benefits denial or decision letter. The system analyzes it, identifies issues, organizes evidence, drafts the response, and mails it with proof of delivery.",
          areaServed: { "@type": "Country", name: "United States" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "What types of benefits denials can I appeal?", acceptedAnswer: { "@type": "Answer", text: "SSDI and SSI denials, unemployment determinations, Medicaid and SNAP denials, VA benefits denials, housing benefits denials, disability benefits denials, overpayment notices, and reconsideration requests." } },
            { "@type": "Question", name: "How does Benefits Appeal work?", acceptedAnswer: { "@type": "Answer", text: "Upload your denial letter. The system analyzes it to identify the stated denial reason, deadline, and appeal requirements. You add your evidence and facts. A structured appeal is drafted for your review. You approve before anything is mailed." } },
            { "@type": "Question", name: "Is Benefits Appeal a law firm?", acceptedAnswer: { "@type": "Answer", text: "No. Benefits Appeal is a correspondence tool, not a law firm. We help you organize your documents and prepare a written appeal. We do not provide legal advice or guarantee any outcome." } },
            { "@type": "Question", name: "How much does it cost?", acceptedAnswer: { "@type": "Answer", text: `Mailing starts at $${(PRICES.standard / 100).toFixed(2)} for Standard, $${(PRICES.certified / 100).toFixed(2)} for Certified with tracking, and $${(PRICES.registered / 100).toFixed(2)} for Registered mail. No subscription required.` } },
            { "@type": "Question", name: "Do I have to mail it through you?", acceptedAnswer: { "@type": "Answer", text: "No. You can download the prepared document and submit it yourself. Mailing through MailMyPDF is optional and provides tracking and proof of delivery." } },
          ],
        }),
      },
    ],
  }),
});

/* ── Section data ── */

const processSteps = [
  { num: "01", icon: FileSearch, title: "Upload & analyze", desc: "Share the benefits denial or decision you received. We analyze it to identify the key facts, deadlines, and appeal requirements." },
  { num: "02", icon: FolderOpen, title: "Organize & draft", desc: "Add your evidence and answer guided questions. We draft your appeal letter — addressing each denial reason with source-grounded support. You review word by word." },
  { num: "03", icon: Mail, title: "Mail with proof", desc: "Choose Standard, Certified, or Registered mail. We print, envelope, and send via USPS with tracking and proof of delivery." },
];

const stats = [
  { value: "15+", label: "Benefits appeal workflows" },
  { value: `${(PRICES.standard / 100).toFixed(2)}`, label: "Mailing (standard)" },
  { value: "100%", label: "You control the facts" },
  { value: "0", label: "Printers needed" },
];

const trustItems = [
  { icon: Lock, label: "Private by design" },
  { icon: ShieldCheck, label: "Evidence-first workflow" },
  { icon: Eye, label: "Human review before mailing" },
  { icon: Stamp, label: "Proof of delivery" },
];

const pillars = [
  { icon: FileSearch, title: "Understand the denial", desc: "The system reads the decision letter, extracts the stated denial reason, identifies the deadline, and surfaces what the agency cited — so you know exactly what you're responding to." },
  { icon: ShieldCheck, title: "Build with evidence", desc: "Organize medical records, work history, correspondence, and supporting documents. The system identifies gaps between the denial reason and your evidence, and builds source-grounded appeal grounds." },
  { icon: Stamp, title: "Send & prove", desc: "Approve the exact draft. Choose Certified mail for tracking and delivery confirmation. Your appeal arrives with a documented record — your proof of timely response." },
];

const faqs = [
  { q: "What types of benefits denials can I appeal?", a: "SSDI and SSI denials, unemployment determinations (including EDD), Medicaid and SNAP denials, VA benefits denials, housing benefits denials, disability benefits denials, overpayment notices, and requests for reconsideration. Each workflow type is tailored to the specific decision and agency." },
  { q: "How does Benefits Appeal work?", a: "Upload your denial letter. The system analyzes it to identify the stated denial reason, deadline, and appeal requirements. You add your evidence and facts. A structured appeal is drafted — addressing each reason individually. You review, edit, and approve before anything is mailed." },
  { q: "Is this legal advice?", a: "No. Benefits Appeal is a correspondence tool, not a law firm. We help you organize your documents and prepare a written appeal. We do not provide legal advice or guarantee any outcome. For complex cases, consult an attorney or accredited representative." },
  { q: "What documents should I provide?", a: "The denial or decision letter is essential. Depending on your case, you may also provide medical records, work history, income documentation, prior correspondence with the agency, and any supporting evidence relevant to the denial reason." },
  { q: "Can I change the draft?", a: "Yes. You review the draft before anything is sent. You can edit the content, add or remove sections, and approve only when you're satisfied with the result. Nothing is mailed without your explicit approval." },
  { q: "Do I have to mail it through you?", a: "No. Mailing is optional. You can download the prepared document and submit it yourself. Mailing through MailMyPDF provides printing, postage, tracking, and proof of delivery — but the choice is yours." },
  { q: "How much does it cost?", a: `Mailing starts at $${(PRICES.standard / 100).toFixed(2)} for Standard, $${(PRICES.certified / 100).toFixed(2)} for Certified with tracking and delivery confirmation, and $${(PRICES.registered / 100).toFixed(2)} for Registered mail. No subscription required. Preparation and mailing are separate — you approve before anything is sent.` },
  { q: "What if I miss the appeal deadline?", a: "Benefits denials often have strict deadlines — typically 30 to 65 days depending on the agency and appeal level. Check your denial letter for the exact deadline. If you're close to the deadline, Certified mail provides proof of timely mailing. If you've already missed it, consult an attorney about whether late filing is possible in your situation." },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-paper page-fade">
      <SiteHeader />
      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl gap-0 px-4 sm:px-6 md:grid-cols-[1.15fr_1fr]">
            {/* Left: Headline + CTAs */}
            <div className="flex flex-col justify-center py-12 sm:py-16 md:py-24 md:pr-10">
              <div className="eyebrow">A MailMyPDF Product</div>
              <h1 className="mt-4 font-serif text-4xl leading-[1.05] sm:text-5xl md:text-6xl md:leading-[1.03]">
                Understand the denial. Build the appeal. <span className="italic text-stamp">Mail it.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-ink-soft sm:text-lg">
                Benefits Appeal helps you respond to denied SSDI, SSI, unemployment, Medicaid, SNAP, VA, housing, and disability benefits with a source-grounded appeal letter — reviewed, approved, and mailed with proof of delivery.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                No account required · Private &amp; secure · Not a law firm — you control the facts
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link to="/workflows" className="btn-primary inline-flex items-center gap-2">
                  Find your workflow <ArrowRight size={18} />
                </Link>
                <Link to="/how-it-works" className="btn-secondary inline-flex items-center gap-2">
                  How it works
                </Link>
              </div>
              {/* Trust indicators */}
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-stamp" /> Document-focused</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-stamp" /> Private by design</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-stamp" /> Review before sending</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-stamp" /> Proof of delivery</span>
              </div>
            </div>
            {/* Right: Hero image */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 -mr-6 lg:-mr-10">
                <img
                  src={HERO_IMAGE}
                  alt="A warm, professional benefits appeals office with neatly organized case files and documents"
                  className="h-full w-full rounded-l-2xl object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
        <section className="border-b border-rule/60 bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-6">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <Icon size={16} className="text-stamp" strokeWidth={1.5} />
                <span className="text-sm font-medium text-ink-soft">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-4xl text-ink">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PILLARS ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <div className="eyebrow">What Benefits Appeal does</div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">More than a letter generator.</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              Each workflow reads the denial, identifies the stated reasons, organizes your evidence, and builds a structured appeal you can review — not a generic template.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {pillars.map((p) => (
                <div key={p.title}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-card">
                    <p.icon size={20} className="text-stamp" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-ink">{p.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED WORKFLOWS ── */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="eyebrow">Featured workflows</div>
            <h2 className="mt-3 font-serif text-3xl">Find your appeal type</h2>
            <p className="mt-2 text-muted-foreground">Each workflow is tailored to the specific benefits decision and agency.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {APPEAL_CATALOG.filter((e) => e.executable).slice(0, 9).map((entry) => (
                <Link
                  key={entry.slug}
                  to={entry.workflowRoute}
                  className="group block rounded-xl border border-rule bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-stamp/40 hover:shadow-card"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{entry.category}</div>
                  <h3 className="mt-2 font-serif text-xl leading-tight">{entry.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.shortDescription}</p>
                  <div className="mt-4 pt-2">
                    <span className="text-sm font-medium text-stamp">{entry.cta}</span>
                    <span className="ml-2 text-muted-foreground transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                View all workflows <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="eyebrow">How it works</div>
            <h2 className="mt-3 font-serif text-3xl">Three steps. Real mail. Full record.</h2>
            <div className="mt-8 space-y-6">
              {processSteps.map((step) => (
                <div key={step.num} className="flex gap-5 rounded-2xl border border-rule bg-card p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-paper">
                    <step.icon size={18} className="text-stamp" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{step.num}</div>
                    <h3 className="mt-1 font-serif text-2xl">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-6 py-16">
            <div className="eyebrow">Pricing</div>
            <h2 className="mt-3 font-serif text-3xl">Clear pricing. No subscriptions.</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              Preparation and mailing are separate. You review and approve the appeal before anything is sent.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-rule bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Standard</div>
                <div className="mt-2 font-serif text-3xl text-ink">${(PRICES.standard / 100).toFixed(2)}</div>
                <p className="mt-2 text-sm text-muted-foreground">3–7 business days · Tracking included</p>
              </div>
              <div className="rounded-xl border border-rule bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Certified</div>
                <div className="mt-2 font-serif text-3xl text-ink">${(PRICES.certified / 100).toFixed(2)}</div>
                <p className="mt-2 text-sm text-muted-foreground">Delivery tracking + confirmation · 3–7 days</p>
              </div>
              <div className="rounded-xl border border-rule bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Registered</div>
                <div className="mt-2 font-serif text-3xl text-ink">${(PRICES.registered / 100).toFixed(2)}</div>
                <p className="mt-2 text-sm text-muted-foreground">Secure handling + tracking · 5–10 days</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Mailing prices include printing, paper, envelope, and postage. No subscription required. One MailMyPDF account works across all products.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="eyebrow">Questions & answers</div>
            <h2 className="mt-3 font-serif text-3xl">Frequently asked questions</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((item, i) => (
                <div key={i} className="rounded-lg border border-rule bg-card p-5">
                  <h3 className="font-medium text-foreground">{item.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-6">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="border-t border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="postmark mx-auto w-fit">AI assistance. Human approval.</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">
              The system does the heavy lifting. You approve the result.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Benefits Appeal can analyze the denial, organize evidence, surface gaps, and prepare a draft. You remain responsible for your facts and approve the exact correspondence before mailing.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/workflows" className="btn-primary inline-flex items-center gap-2">
                Find your workflow <ArrowRight size={18} />
              </Link>
              <Link to="/how-it-works" className="btn-secondary inline-flex items-center gap-2">
                How it works
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
