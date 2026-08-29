import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ShieldCheck, Clock, PackageCheck, FileSearch, Send, Eye, CalendarClock, Stamp, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { APPEAL_CATALOG, CATEGORY_ORDER } from "@/domain/appeal-catalog";

const SITE_ORIGIN = "https://appeal-mail.pages.dev";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { name: "description", content: "Understand adverse decisions, organize evidence, build supported appeals, and mail them with proof of delivery. A MailMyPDF product." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { property: "og:description", content: "Analyze decisions, organize evidence, build supported appeals, and send with proof of delivery. A MailMyPDF product." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Appeal Mail" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/a99daa8e1_generated_image.png" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "1024" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { name: "twitter:description", content: "Analyze decisions, organize evidence, build supported appeals, and send with proof of delivery." },
      { name: "twitter:image", content: "https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/a99daa8e1_generated_image.png" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Appeal Mail",
          description: "Specialized workflows for understanding adverse decisions, organizing evidence, and building supported appeals with proof of delivery.",
          url: SITE_ORIGIN,
          publisher: { "@type": "Organization", name: "MailMyPDF" },
          hasPart: Object.values(workflows).map((workflow) => ({ "@type": "WebPage", name: workflow.title, url: SITE_ORIGIN + "/workflows/" + workflow.id, about: workflow.primaryKeyword || workflow.title })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Appeal Mail",
          serviceType: "Appeal letter preparation and mailing",
          provider: { "@type": "Organization", name: "MailMyPDF" },
          description: "Upload a denial or decision letter. The system analyzes it, identifies issues, organizes evidence, drafts the response, and mails it with proof of delivery.",
          areaServed: { "@type": "Country", name: "United States" },
        }),
      },
    ],
  }),
});

/* ── Lifecycle steps for the hero diagram ── */
const lifecycleSteps = [
  { icon: FileText, label: "Decision", desc: "Upload the letter" },
  { icon: FileSearch, label: "Issues", desc: "AI finds problems" },
  { icon: ShieldCheck, label: "Evidence", desc: "Source-linked grounds" },
  { icon: FileText, label: "Draft", desc: "Built from analysis" },
  { icon: CheckCircle2, label: "Review", desc: "You approve it" },
  { icon: Mail, label: "Mail", desc: "USPS via MailMyPDF" },
  { icon: PackageCheck, label: "Proof", desc: "Delivery certificate" },
];

/* ── Stats ── */
const stats = [
  { value: "3–5", label: "Business day delivery" },
  { value: `${(PRICES.standard / 100).toFixed(2)}`, label: "Mailing (standard)" },
  { value: "100%", label: "You control the facts" },
  { value: "0", label: "Printers needed" },
];

/* ── Trust items ── */
const trustItems = [
  { icon: ShieldCheck, title: "User review before sending", desc: "Nothing is mailed until you review and approve it." },
  { icon: Eye, title: "Source-aware reasoning", desc: "Findings cite the exact document and passage they come from." },
  { icon: AlertTriangle, title: "No fabricated facts", desc: "The AI never invents facts, legal conclusions, or evidence." },
  { icon: Mail, title: "No automatic mailing", desc: "Physical mail is never sent without your explicit authorization." },
];

/* ── FAQ ── */
const faqItems = [
  { q: "Is this legal advice?", a: "No. Appeal Mail is a correspondence tool, not a law firm. We help you prepare and send appeal documents — we do not provide legal advice." },
  { q: "What types of decisions can I appeal?", a: "Insurance claim denials, health insurance decisions, SSI and SSDI denials, unemployment determinations, Medicaid denials, licensing and DMV decisions, and more. Browse the full directory on the Workflows page." },
  { q: "How does the mailing work?", a: "Your final document is printed, placed in an envelope, and mailed via USPS by MailMyPDF. You can choose first-class, certified, or certified with return receipt for proof of delivery." },
  { q: "Is my data secure?", a: "All documents are stored with encryption, never shared with third parties, and never used for marketing. You can request full deletion at any time." },
  { q: "What does it cost?", a: "Mailing starts at $4.99 standard (includes printing, paper, envelope, and postage). Certified is $14.94. Workflow preparation is separate and starts at $24.99. No subscription required." },
  { q: "Do I need a MailMyPDF account?", a: "Yes. A free MailMyPDF Account lets you save your work, track mailings, and keep proof of delivery. One account works across all MailMyPDF products." },
];

/* ── Featured workflow categories for the preview grid ── */
const featuredCategories = [
  {
    name: "Insurance",
    workflows: ["insurance-claim", "health-insurance", "medicare"],
  },
  {
    name: "Disability & Social Security",
    workflows: ["ssi", "ssdi", "social-security-reconsideration"],
  },
  {
    name: "Government & Administrative",
    workflows: ["medicaid", "unemployment", "agency-decision"],
  },
];

function getCatalogEntry(slug: string) {
  return APPEAL_CATALOG.find((w) => w.slug === slug);
}

/* ═══════════════════════════════════════════════════════════
   Workflow Diagram — the signature hero visual
   ═══════════════════════════════════════════════════════════ */
function WorkflowDiagram() {
  return (
    <div className="relative">
      {/* Subtle paper texture via stamp-colored radial */}
      <div
        className="absolute inset-0 -z-10 rounded-2xl"
        style={{
          background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--stamp) 5%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="rounded-2xl border border-rule bg-card p-6 md:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <span className="postmark">Appeal Lifecycle</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">7 stages</span>
        </div>

        {/* Vertical flow on mobile, horizontal on desktop */}
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:gap-0">
          {lifecycleSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 md:flex-1 md:flex-col md:items-center md:text-center">
              {/* Node */}
              <div className="relative flex flex-shrink-0 items-center justify-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border transition-all"
                  style={{
                    borderColor: i === 0 ? "var(--stamp)" : "var(--rule)",
                    background: i === 0 ? "color-mix(in oklab, var(--stamp) 8%, transparent)" : "var(--paper-deep)",
                  }}
                >
                  <step.icon
                    size={18}
                    className={i === 0 ? "text-stamp" : "text-ink-soft"}
                  />
                </div>
              </div>

              {/* Label */}
              <div className="flex-1 md:mt-3 md:flex-none">
                <p className="text-sm font-semibold text-ink">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>

              {/* Connector */}
              {i < lifecycleSteps.length - 1 && (
                <div
                  className="ml-auto h-px flex-1 md:mb-0 md:ml-0 md:mt-0 md:w-8"
                  style={{
                    background: "var(--rule)",
                    minHeight: "1px",
                    minWidth: "1px",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 border-t border-rule pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stamp size={12} className="text-stamp" />
            <span className="font-mono uppercase tracking-widest">You approve before anything is mailed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Featured Workflow Card
   ═══════════════════════════════════════════════════════════ */
function FeaturedWorkflowCard({ entry }: { entry: ReturnType<typeof getCatalogEntry> }) {
  if (!entry) return null;
  const isExecutable = entry.status === "IMPLEMENTED" && entry.executable;

  return (
    <Link to={entry.route} className="card group block p-5 transition-all hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="badge badge-amber">{entry.category}</span>
        {isExecutable ? (
          <span className="badge badge-green">Available</span>
        ) : (
          <span className="badge badge-outline">Catalog</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-ink transition-colors group-hover:text-stamp" style={{ fontFamily: "var(--font-serif)" }}>
        {entry.title}
      </h3>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{entry.shortDescription}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-soft transition-colors group-hover:text-stamp">
        Learn more <ArrowRight size={12} />
      </div>
    </Link>
  );
}

function HomePage() {
  const workflowCount = Object.keys(workflows).length;

  return (
    <main>
      <SiteHeader />

      {/* ═══════════ Hero ═══════════ */}
      <section className="relative isolate overflow-hidden">
        {/* Background image — professional private office */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(https://media.base44.com/images/public/6a8bd310dfdf9ad92cf26415/a99daa8e1_generated_image.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Navy-charcoal overlay for text legibility */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "linear-gradient(135deg, rgba(26,29,41,0.94) 0%, rgba(26,29,41,0.80) 45%, rgba(26,29,41,0.72) 100%)",
          }}
        />
        <div className="container relative py-24 md:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: text */}
            <div className="max-w-xl">
              <span className="postmark mb-6" style={{ borderColor: "rgba(180,83,9,0.5)", color: "rgba(217,180,120,0.9)" }}>Don't let the deadline pass</span>
              <h1
                className="mt-6 text-4xl leading-tight hero-light md:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Understand the decision.<br />
                Build the response.<br />
                <span className="text-stamp">Send it with proof.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 hero-muted sm:text-lg">
                Got a denial, suspension, or government decision you need to challenge?
                Upload the document, let the analysis find the issues, build a supported response,
                and mail it with proof of timely filing.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full bg-stamp px-6 py-3 text-sm font-medium hero-light shadow-lg transition-transform hover:-translate-y-0.5">
                  Find your appeal type <ArrowRight size={16} />
                </Link>
                <Link to="/workflows/denied-claim" className="inline-flex items-center gap-2 rounded-full border hero-border px-6 py-3 text-sm font-medium hero-light transition-colors hover:bg-white/10">
                  Start with a denied claim
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-2 text-xs hero-muted-soft">
                <Mail size={12} strokeWidth={2.5} />
                <span className="font-mono uppercase tracking-widest">A MailMyPDF product</span>
                <span className="mx-2 hero-divider">·</span>
                <span>{workflowCount} specialized workflows</span>
              </div>
            </div>

            {/* Right: workflow diagram */}
            <div className="hidden lg:block">
              <WorkflowDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Stats ═══════════ */}
      <section className="border-y border-rule bg-card py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ Workflow Lifecycle ═══════════ */}
      <section id="how" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
              From decision to proof of delivery
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-soft">
              Every appeal follows the same disciplined progression. You stay in control at every step —
              nothing is mailed until you approve it.
            </p>
          </div>

          {/* Mobile diagram (shown on small screens) */}
          <div className="mt-12 lg:hidden">
            <WorkflowDiagram />
          </div>

          {/* Desktop expanded lifecycle */}
          <div className="mt-12 hidden lg:block">
            <div className="flex items-start gap-2">
              {lifecycleSteps.map((step, i) => (
                <div key={step.label} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border transition-all"
                      style={{
                        borderColor: i === 0 ? "var(--stamp)" : "var(--rule)",
                        background: i === 0 ? "color-mix(in oklab, var(--stamp) 8%, transparent)" : "var(--paper-deep)",
                      }}
                    >
                      <step.icon size={22} className={i === 0 ? "text-stamp" : "text-ink-soft"} />
                    </div>
                    <span className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{step.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                  {i < lifecycleSteps.length - 1 && (
                    <div
                      className="mt-7 h-px flex-1 self-start"
                      style={{ background: "var(--rule)", minWidth: "20px" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ Featured Workflow Types ═══════════ */}
      <section className="border-y border-rule bg-card py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <span className="eyebrow">Appeal Types</span>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
              {workflowCount} specialized workflows
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-soft">
              Each workflow is tailored to a specific type of decision — insurance denials, government benefits,
              DMV suspensions, financial aid appeals, and more.
            </p>
          </div>

          {featuredCategories.map((cat) => (
            <div key={cat.name} className="mt-10">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-soft">
                <span className="h-px w-6 bg-rule" />
                {cat.name}
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                {cat.workflows.map((slug) => {
                  const entry = getCatalogEntry(slug);
                  return <FeaturedWorkflowCard key={slug} entry={entry} />;
                })}
              </div>
            </div>
          ))}

          <div className="mt-10">
            <Link to="/workflows" className="btn-amber">
              Browse all {workflowCount} workflows <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ Trust ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl">
            <span className="eyebrow">Safety & Control</span>
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
              You stay in control
            </h2>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.title} className="card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "color-mix(in oklab, var(--stamp) 8%, transparent)" }}>
                  <item.icon size={18} className="text-stamp" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="border-y border-rule bg-card py-20 md:py-28">
        <div className="container max-w-3xl">
          <span className="eyebrow">FAQ</span>
          <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
            Common questions
          </h2>
          <div className="mt-8 space-y-6">
            {faqItems.map((item) => (
              <div key={item.q} className="border-b border-rule pb-6">
                <h3 className="text-base font-semibold text-ink">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 md:py-28">
        <div className="container max-w-2xl text-center">
          <span className="postmark mb-6">Start today</span>
          <h2 className="text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
            Ready to start?
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Find the workflow that matches your situation and upload your document.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/workflows" className="btn-amber">
              Browse appeal types <ArrowRight size={16} />
            </Link>
            <Link to="/auth" className="btn-outline">
              Create a MailMyPDF Account
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
