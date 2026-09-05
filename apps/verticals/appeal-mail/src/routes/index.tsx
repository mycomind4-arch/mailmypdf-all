import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail, ShieldCheck, PackageCheck, FileSearch, Eye, Stamp, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { APPEAL_CATALOG } from "@/domain/appeal-catalog";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://appeal-mail.pages.dev";
const VerticalHero = createVerticalHero(createElement);
const SharedTrustStrip = createTrustStrip(createElement);

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
      { property: "og:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Appeal Mail — Understand the Decision. Build the Appeal. Mail It." },
      { name: "twitter:description", content: "Analyze decisions, organize evidence, build supported appeals, and send with proof of delivery." },
      { name: "twitter:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
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
          serviceType: "Appeal correspondence preparation and mailing",
          provider: { "@type": "Organization", name: "MailMyPDF" },
          description: "Upload a denial or decision letter, organize the issues and evidence, prepare a response, review it, and choose mailing with proof options.",
          areaServed: { "@type": "Country", name: "United States" },
        }),
      },
    ],
  }),
});

const lifecycleSteps = [
  { icon: FileText, label: "Decision", desc: "Upload the letter" },
  { icon: FileSearch, label: "Issues", desc: "Surface the issues" },
  { icon: ShieldCheck, label: "Evidence", desc: "Link support" },
  { icon: FileText, label: "Draft", desc: "Build the response" },
  { icon: CheckCircle2, label: "Review", desc: "You approve it" },
  { icon: Mail, label: "Mail", desc: "Send via MailMyPDF" },
  { icon: PackageCheck, label: "Proof", desc: "Keep the record" },
];

const stats = [
  { value: `$${(PRICES.standard / 100).toFixed(2)}`, label: "Standard mailing" },
  { value: `${Object.keys(workflows).length}`, label: "Specialized workflows" },
  { value: "100%", label: "You control the facts" },
  { value: "0", label: "Printers needed" },
];

const trustItems = [
  { icon: ShieldCheck, title: "User review before sending", desc: "Nothing is mailed until you review and approve it." },
  { icon: Eye, title: "Source-aware reasoning", desc: "Findings can point back to the document and evidence they came from." },
  { icon: AlertTriangle, title: "No fabricated facts", desc: "Workflow guidance is built around supplied facts and reviewable suggestions." },
  { icon: Mail, title: "No automatic mailing", desc: "Physical mail is not sent without your explicit authorization." },
];

const faqItems = [
  { q: "Is this legal advice?", a: "No. Appeal Mail is a correspondence tool, not a law firm. It helps you prepare and send appeal documents and does not provide legal advice." },
  { q: "What types of decisions can I appeal?", a: "Appeal Mail includes workflows for insurance claim denials, health insurance decisions, SSI and SSDI denials, unemployment determinations, Medicaid denials, licensing and DMV decisions, and other adverse decisions. Browse the workflow directory for the current catalog." },
  { q: "How does the mailing work?", a: "After you approve the final document, MailMyPDF can print, envelope, and mail it. Available tracking and proof depend on the mailing service you select." },
  { q: "How are my documents handled?", a: "Protected workflow access is tied to your MailMyPDF account and matter context. Review the platform Security & Trust and privacy controls for current handling, retention, and deletion details." },
  { q: "What does it cost?", a: `Standard mailing starts at $${(PRICES.standard / 100).toFixed(2)}. Certified and Registered options are priced separately. Workflow preparation pricing depends on the selected workflow and is shown before purchase.` },
  { q: "Do I need a MailMyPDF account?", a: "An account is used for private workflow intake, saved documents, drafts, mailing records, and proof. One MailMyPDF account works across the ecosystem." },
];

const featuredCategories = [
  { name: "Insurance", workflows: ["insurance-claim", "health-insurance", "medicare"] },
  { name: "Disability & Social Security", workflows: ["ssi", "ssdi", "social-security-reconsideration"] },
  { name: "Government & Administrative", workflows: ["medicaid", "unemployment", "agency-decision"] },
];

function getCatalogEntry(slug: string) {
  return APPEAL_CATALOG.find((w) => w.slug === slug);
}

function WorkflowDiagram() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 rounded-2xl" style={{ background: "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--stamp) 5%, transparent) 0%, transparent 70%)" }} />
      <div className="rounded-2xl border border-rule bg-card p-6 md:p-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-6 flex items-center justify-between"><span className="postmark">Appeal Lifecycle</span><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">7 stages</span></div>
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:gap-0">
          {lifecycleSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 md:flex-1 md:flex-col md:items-center md:text-center">
              <div className="relative flex flex-shrink-0 items-center justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: i === 0 ? "var(--stamp)" : "var(--rule)", background: i === 0 ? "color-mix(in oklab, var(--stamp) 8%, transparent)" : "var(--paper-deep)" }}><step.icon size={18} className={i === 0 ? "text-stamp" : "text-ink-soft"}/></div></div>
              <div className="flex-1 md:mt-3 md:flex-none"><p className="text-sm font-semibold text-ink">{step.label}</p><p className="text-xs text-muted-foreground">{step.desc}</p></div>
              {i < lifecycleSteps.length - 1 && <div className="ml-auto h-px flex-1 md:mb-0 md:ml-0 md:mt-0 md:w-8" style={{ background: "var(--rule)", minHeight: "1px", minWidth: "1px" }} />}
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-rule pt-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Stamp size={12} className="text-stamp"/><span className="font-mono uppercase tracking-widest">You approve before anything is mailed</span></div></div>
      </div>
    </div>
  );
}

function FeaturedWorkflowCard({ entry }: { entry: ReturnType<typeof getCatalogEntry> }) {
  if (!entry) return null;
  const isExecutable = entry.status === "IMPLEMENTED" && entry.executable;
  return (
    <Link to={entry.route} className="card group block p-5 transition-all hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5">
      <div className="mb-3 flex items-center justify-between"><span className="badge badge-amber">{entry.category}</span>{isExecutable ? <span className="badge badge-green">Available</span> : <span className="badge badge-outline">Catalog</span>}</div>
      <h3 className="text-base font-semibold text-ink transition-colors group-hover:text-stamp" style={{ fontFamily: "var(--font-serif)" }}>{entry.title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{entry.shortDescription}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-soft transition-colors group-hover:text-stamp">Learn more <ArrowRight size={12}/></div>
    </Link>
  );
}

function HomePage() {
  const workflowCount = Object.keys(workflows).length;
  return (
    <main>
      <SiteHeader />

      <VerticalHero
        theme="appeal-mail"
        tone="dark"
        eyebrow="Challenge. Respond. Move forward."
        title="Turn denials into new opportunities."
        description="Prepare appeals and reconsideration requests with guided workflows, organized evidence, reviewable drafts, and optional MailMyPDF mailing with proof."
        imageSrc="/ecosystem-hero-sprite.jpg"
        imageAlt="Judge's gavel and scales representing appeals and reconsideration"
        imageBackgroundSize="200% 300%"
        imageBackgroundPosition="100% 0%"
        actions={
          <>
            <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full bg-stamp px-6 py-3 text-sm font-medium text-white shadow-lg transition-transform hover:-translate-y-0.5">Start an Appeal <ArrowRight size={16}/></Link>
            <Link to="/workflows" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">Find the Right Appeal</Link>
          </>
        }
        meta={<><span>A MailMyPDF product</span><span>Review before mailing</span><span>Tracking & proof options</span></>}
      />

      <SharedTrustStrip items={[
        { icon: <FileText size={16}/>, title: "No printer required", description: "Prepare and mail online" },
        { icon: <FileSearch size={16}/>, title: "Decision-focused guidance", description: "Start from the denial or adverse decision" },
        { icon: <ShieldCheck size={16}/>, title: "You approve before mailing", description: "Review the exact appeal first" },
        { icon: <Mail size={16}/>, title: "Tracking & proof available", description: "Keep the mailing record together" },
      ]}/>

      <section className="border-y border-rule bg-card py-12">
        <div className="container"><div className="grid grid-cols-2 gap-8 md:grid-cols-4">{stats.map((stat) => <div key={stat.label}><p className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{stat.value}</p><p className="mt-1 text-sm text-muted-foreground">{stat.label}</p></div>)}</div></div>
      </section>

      <section id="how" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl"><span className="eyebrow">How it works</span><h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>From decision to proof of delivery</h2><p className="mt-4 text-base leading-7 text-ink-soft">Every appeal follows the same disciplined progression. You stay in control at every step — nothing is mailed until you approve it.</p></div>
          <div className="mt-12 lg:hidden"><WorkflowDiagram /></div>
          <div className="mt-12 hidden lg:block"><div className="flex items-start gap-2">{lifecycleSteps.map((step, i) => <div key={step.label} className="flex flex-1 items-start"><div className="flex flex-col items-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ borderColor: i === 0 ? "var(--stamp)" : "var(--rule)", background: i === 0 ? "color-mix(in oklab, var(--stamp) 8%, transparent)" : "var(--paper-deep)" }}><step.icon size={22} className={i === 0 ? "text-stamp" : "text-ink-soft"}/></div><span className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><h3 className="mt-1 text-lg font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>{step.label}</h3><p className="mt-1 text-xs text-muted-foreground">{step.desc}</p></div>{i < lifecycleSteps.length - 1 && <div className="mt-7 h-px flex-1 self-start" style={{ background: "var(--rule)", minWidth: "20px" }}/>}</div>)}</div></div>
        </div>
      </section>

      <section className="border-y border-rule bg-card py-20 md:py-28">
        <div className="container">
          <div className="max-w-2xl"><span className="eyebrow">Appeal Types</span><h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>{workflowCount} specialized workflows</h2><p className="mt-4 text-base leading-7 text-ink-soft">Each workflow is tailored to a specific type of decision — insurance denials, government benefits, DMV suspensions, financial aid appeals, and more.</p></div>
          {featuredCategories.map((cat) => <div key={cat.name} className="mt-10"><h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-soft"><span className="h-px w-6 bg-rule"/>{cat.name}</h3><div className="grid gap-4 md:grid-cols-3">{cat.workflows.map((slug) => <FeaturedWorkflowCard key={slug} entry={getCatalogEntry(slug)}/>)}</div></div>)}
          <div className="mt-10"><Link to="/workflows" className="btn-amber">Browse all {workflowCount} workflows <ArrowRight size={16}/></Link></div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container"><div className="max-w-2xl"><span className="eyebrow">Safety & Control</span><h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>You stay in control</h2></div><div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{trustItems.map((item) => <div key={item.title} className="card p-5"><div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "color-mix(in oklab, var(--stamp) 8%, transparent)" }}><item.icon size={18} className="text-stamp"/></div><h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p></div>)}</div></div>
      </section>

      <section className="border-y border-rule bg-card py-20 md:py-28">
        <div className="container max-w-3xl"><span className="eyebrow">FAQ</span><h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Common questions</h2><div className="mt-8 space-y-6">{faqItems.map((item) => <div key={item.q} className="border-b border-rule pb-6"><h3 className="text-base font-semibold text-ink">{item.q}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p></div>)}</div></div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container max-w-2xl text-center"><span className="postmark mb-6">Start today</span><h2 className="text-3xl font-bold text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Ready to start?</h2><p className="mt-4 text-base text-muted-foreground">Find the workflow that matches your situation and upload your document.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/workflows" className="btn-amber">Browse appeal types <ArrowRight size={16}/></Link><Link to="/auth" className="btn-outline">Create a MailMyPDF Account</Link></div></div>
      </section>

      <SiteFooter />
    </main>
  );
}
