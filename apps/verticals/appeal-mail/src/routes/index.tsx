import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  FileSearch,
  FileText,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  PencilLine,
  Scale,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { createElement } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { workflows } from "@/domain/workflows";
import { APPEAL_CATALOG, CATEGORY_ORDER } from "@/domain/appeal-catalog";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://appeal-mail.pages.dev";
const VerticalHero = createVerticalHero(createElement);
const SharedTrustStrip = createTrustStrip(createElement);
const standardMailPrice = `$${(PRICES.standard / 100).toFixed(2)}`;

const featuredWorkflows = APPEAL_CATALOG.filter(
  (workflow) => workflow.status === "IMPLEMENTED" && workflow.executable,
).slice(0, 8);

const journeySteps = [
  {
    icon: Upload,
    title: "Upload your decision",
    description: "Start with the denial, notice, determination, or decision letter you received.",
  },
  {
    icon: FileSearch,
    title: "Understand the record",
    description: "Surface the stated reasons, important facts, deadlines, and supporting evidence.",
  },
  {
    icon: PencilLine,
    title: "Build the appeal",
    description: "Prepare a structured appeal letter or packet around the record you provide.",
  },
  {
    icon: CheckCircle2,
    title: "Review & approve",
    description: "Edit the documents, confirm the facts, and approve the exact packet before sending.",
  },
  {
    icon: Send,
    title: "Send it — or we mail it",
    description: `Download and send it yourself, or use MailMyPDF mailing from ${standardMailPrice}.`,
  },
  {
    icon: Archive,
    title: "Track & keep proof",
    description: "Keep available tracking, mailing records, and proof together with the matter.",
  },
];

const packetItems = [
  { icon: FileText, label: "Appeal letter or brief" },
  { icon: FileCheck2, label: "Evidence checklist" },
  { icon: PackageCheck, label: "Exhibits & attachments" },
  { icon: Mail, label: "Mailing options" },
  { icon: Archive, label: "Tracking & proof record" },
];

const faqItems = [
  {
    q: "Is this legal advice?",
    a: "No. Appeal Mail is a correspondence and document-preparation tool, not a law firm. It helps you organize, prepare, review, and send appeal documents; it does not provide legal advice.",
  },
  {
    q: "What types of decisions can I appeal?",
    a: "The current catalog includes insurance denials, health coverage decisions, SSI and SSDI matters, unemployment determinations, Medicaid and other benefits decisions, workers’ compensation, veterans matters, and administrative decisions. The workflow directory shows the current catalog and availability.",
  },
  {
    q: "What documents do I need to get started?",
    a: "Start with the decision, denial, or notice you received. Individual workflows may also ask for plan documents, prior correspondence, records, receipts, reports, medical documentation, or other evidence relevant to that appeal.",
  },
  {
    q: "Do I have to use the mailing service?",
    a: "No. You can prepare and download your documents. Mailing is optional. If you choose MailMyPDF fulfillment, you review the exact packet before authorizing physical mail.",
  },
  {
    q: "How does tracking and proof work?",
    a: "Available tracking and proof depend on the mailing service you select. Where available, the mailing record stays associated with the matter so you can keep the prepared packet and delivery record together.",
  },
  {
    q: "How are my documents handled?",
    a: "Private workflow access is tied to your MailMyPDF account and matter context. Current handling, retention, deletion, and security controls are described in the platform Security & Trust and privacy materials.",
  },
];

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Appeal Mail — Turn Denials Into a Clear Appeal Plan" },
      {
        name: "description",
        content:
          "Upload a denial or adverse decision, understand the record, organize evidence, prepare an appeal, review it, and optionally mail it with tracking and proof through MailMyPDF.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Appeal Mail — Turn Denials Into a Clear Appeal Plan" },
      {
        property: "og:description",
        content:
          "Guided appeal workflows for insurance, disability, benefits, veterans, unemployment, and administrative decisions — with optional MailMyPDF mailing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Appeal Mail" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Appeal Mail — Turn Denials Into a Clear Appeal Plan" },
      {
        name: "twitter:description",
        content:
          "Understand the decision, build the appeal, review it, and optionally mail it with tracking and proof.",
      },
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
          description:
            "Specialized workflows for understanding adverse decisions, organizing evidence, preparing appeal documents, and optionally mailing with proof.",
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
          name: "Appeal Mail",
          serviceType: "Appeal correspondence preparation and mailing",
          provider: { "@type": "Organization", name: "MailMyPDF" },
          description:
            "Upload a denial or decision letter, understand the stated issues, organize evidence, prepare an appeal, review it, and choose optional mailing with proof.",
          areaServed: { "@type": "Country", name: "United States" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      },
    ],
  }),
});

function WorkflowCard({ workflow }: { workflow: (typeof APPEAL_CATALOG)[number] }) {
  return (
    <Link
      to={workflow.route}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-hover)]"
    >
      <div
        className="relative flex min-h-28 items-end overflow-hidden border-b border-rule p-4"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--stamp) 12%, var(--paper)) 0%, var(--paper-deep) 56%, color-mix(in oklab, var(--ink) 8%, var(--paper)) 100%)",
        }}
      >
        <div className="absolute -right-6 -top-8 h-28 w-28 rotate-12 rounded-sm border border-rule/80 bg-card/75 shadow-sm" />
        <div className="absolute -right-1 top-1 h-24 w-24 rotate-6 rounded-sm border border-rule/80 bg-card/90 shadow-sm" />
        <span className="relative z-10 rounded-full border border-rule bg-card/90 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          {workflow.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl leading-tight text-ink transition-colors group-hover:text-stamp" style={{ fontFamily: "var(--font-serif)" }}>
          {workflow.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{workflow.shortDescription}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-xs font-semibold text-ink-soft">Explore workflow</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-card transition-transform group-hover:translate-x-0.5">
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MobileWorkflowRow({ workflow }: { workflow: (typeof APPEAL_CATALOG)[number] }) {
  return (
    <Link to={workflow.route} className="flex items-center gap-3 border-b border-rule py-4 last:border-b-0">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-rule bg-paper-deep text-stamp">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold text-ink">{workflow.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{workflow.category}</p>
      </div>
      <ArrowRight size={16} className="flex-none text-ink-soft" />
    </Link>
  );
}

function HomePage() {
  const workflowCount = APPEAL_CATALOG.length;

  return (
    <main>
      <SiteHeader />

      <VerticalHero
        theme="appeal-mail"
        tone="light"
        eyebrow="Appeal Mail · Challenge. Respond. Move forward."
        title="Turn denials into new opportunities."
        description="Upload your denial, decision, or notice. Get structured guidance, a professionally prepared appeal packet, review it, and optionally have MailMyPDF send it with tracking and proof."
        imageSrc="/ecosystem-hero-sprite.jpg"
        imageAlt="Judge's gavel and scales representing appeals and reconsideration"
        imageBackgroundSize="200% 300%"
        imageBackgroundPosition="100% 0%"
        actions={
          <>
            <Link
              to="/workflows"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-semibold text-card shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Start an Appeal <ArrowRight size={16} />
            </Link>
            <Link
              to="/workflows"
              className="inline-flex items-center gap-2 rounded-md border border-ink/35 bg-card/80 px-6 py-3 text-sm font-semibold text-ink backdrop-blur-sm transition-colors hover:bg-card"
            >
              Find My Workflow
            </Link>
          </>
        }
        meta={
          <>
            <span>A MailMyPDF product</span>
            <span>You approve before mailing</span>
            <span>Optional mailing & proof</span>
          </>
        }
        panel={
          <div className="rounded-xl border border-card/30 bg-ink/75 p-6 text-card shadow-2xl backdrop-blur-md">
            <Scale size={24} className="text-stamp-soft" />
            <p className="mt-5 text-3xl leading-[1.02]" style={{ fontFamily: "var(--font-serif)" }}>
              Same rights.
              <br />
              New possibilities.
            </p>
            <div className="mt-5 h-px w-12 bg-stamp" />
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-card/65">Build the record. Review the packet. Decide what gets sent.</p>
          </div>
        }
      />

      <SharedTrustStrip
        items={[
          { icon: <FileSearch size={16} />, title: "Structured guidance", description: "Start from the decision you received" },
          { icon: <FileText size={16} />, title: "Prepared documents", description: "Build a reviewable appeal packet" },
          { icon: <CheckCircle2 size={16} />, title: "Approval before mailing", description: "Nothing is mailed until you approve it" },
          { icon: <MapPin size={16} />, title: "Tracking & proof options", description: "Available with selected mailing services" },
        ]}
      />

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="eyebrow">Popular appeal workflows</span>
              <h2 className="mt-3 text-4xl leading-[1.02] text-ink md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
                Find the right appeal workflow for your situation.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">
                Choose a category, browse the current catalog, or start from the decision you received and find the workflow that fits.
              </p>
            </div>
            <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-stamp">
              View all {workflowCount} workflows <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            <Link to="/workflows" className="flex-none rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-card">
              All workflows
            </Link>
            {CATEGORY_ORDER.map((category) => (
              <a
                key={category}
                href={`/workflows?category=${encodeURIComponent(category)}`}
                className="flex-none rounded-md border border-rule bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-paper-deep"
              >
                {category}
              </a>
            ))}
          </div>

          <div className="mt-8 hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">
            {featuredWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.slug} workflow={workflow} />
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-rule bg-card px-5 md:hidden">
            <div className="border-b border-rule py-5">
              <h3 className="text-2xl text-ink" style={{ fontFamily: "var(--font-serif)" }}>Popular Appeal Workflows</h3>
            </div>
            {featuredWorkflows.slice(0, 5).map((workflow) => (
              <MobileWorkflowRow key={workflow.slug} workflow={workflow} />
            ))}
            <div className="py-5 text-center">
              <Link to="/workflows" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                View all workflows <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-5 rounded-xl border border-rule bg-paper-deep p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rule bg-card text-stamp">
              <CircleHelp size={21} />
            </div>
            <div>
              <h3 className="text-2xl text-ink" style={{ fontFamily: "var(--font-serif)" }}>Not sure which appeal you need?</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start from your denial or decision letter. The workflow directory helps you narrow the catalog before you commit to a workflow.
              </p>
            </div>
            <Link to="/workflows" className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-semibold text-card">
              Find My Appeal <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-rule bg-card py-16 md:py-24">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] md:items-end">
            <div>
              <span className="eyebrow">Simple. Clear. Reviewable.</span>
              <h2 className="mt-3 text-4xl leading-none text-ink md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
                How Appeal Mail works.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-ink-soft md:justify-self-end">
              From the decision letter to the final mailing record, the product keeps each stage understandable and keeps you in control of what gets sent.
            </p>
          </div>

          <div className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-rule bg-card md:grid-cols-3 xl:grid-cols-6">
            {journeySteps.map((step, index) => (
              <div key={step.title} className="border-b border-rule p-5 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0">
                <div className="flex items-center gap-3">
                  <step.icon size={19} className="text-stamp" />
                  <span className="text-3xl text-ink" style={{ fontFamily: "var(--font-serif)" }}>{index + 1}</span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid gap-8 border-b border-rule pb-12 md:grid-cols-[minmax(220px,.65fr)_minmax(0,1.35fr)] md:items-center">
            <div>
              <span className="eyebrow">What you get</span>
              <h2 className="mt-3 text-3xl leading-tight text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>
                A complete appeal packet, ready for your review.
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {packetItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-rule bg-card p-4 text-center">
                  <item.icon size={19} className="mx-auto text-stamp" />
                  <p className="mt-3 text-xs font-semibold leading-4 text-ink">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-rule bg-card p-7 md:p-9">
              <span className="eyebrow">Pricing</span>
              <h2 className="mt-3 text-3xl text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Simple, visible pricing.</h2>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-bold text-ink">Workflow preparation</p>
                  <p className="mt-2 text-2xl text-ink" style={{ fontFamily: "var(--font-serif)" }}>Varies by matter</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">The workflow price is shown before purchase so you can review it before continuing.</p>
                </div>
                <div className="border-t border-rule pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <p className="text-sm font-bold text-ink">Mailing with MailMyPDF</p>
                  <p className="mt-2 text-2xl text-ink" style={{ fontFamily: "var(--font-serif)" }}>From {standardMailPrice}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Optional mailing services and available tracking or proof are priced before authorization.</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-rule bg-card p-7 md:p-9">
              <span className="eyebrow">Security & trust</span>
              <h2 className="mt-3 text-3xl text-ink md:text-4xl" style={{ fontFamily: "var(--font-serif)" }}>Your documents stay under your control.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Appeal Mail is designed around private matter access, explicit review, and approval before physical mailing.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 flex-none text-stamp" /><p className="text-xs leading-5 text-ink-soft">Private account and matter access</p></div>
                <div className="flex gap-3"><ShieldCheck size={18} className="mt-0.5 flex-none text-stamp" /><p className="text-xs leading-5 text-ink-soft">Review the exact packet before mailing</p></div>
                <div className="flex gap-3"><FileCheck2 size={18} className="mt-0.5 flex-none text-stamp" /><p className="text-xs leading-5 text-ink-soft">Keep the prepared record together</p></div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="border-y border-rule bg-card py-16 md:py-20">
        <div className="container">
          <div className="flex items-end justify-between gap-5">
            <div>
              <span className="eyebrow">Frequently asked questions</span>
              <h2 className="mt-3 text-4xl text-ink md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>Common questions.</h2>
            </div>
            <Link to="/faq" className="hidden items-center gap-2 text-sm font-semibold text-ink hover:text-stamp sm:inline-flex">
              View all FAQs <ArrowRight size={14} />
            </Link>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details key={item.q} className="group rounded-lg border border-rule bg-paper px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="text-lg text-ink-soft transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="pt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-16 text-card md:py-20">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url('/ecosystem-hero-sprite.jpg')",
            backgroundSize: "200% 300%",
            backgroundPosition: "100% 0%",
            filter: "saturate(.65)",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-ink/55" aria-hidden="true" />
        <div className="container relative">
          <div className="max-w-2xl">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-stamp-soft">Appeal Mail</span>
            <h2 className="mt-4 text-4xl leading-none md:text-6xl" style={{ fontFamily: "var(--font-serif)" }}>You still have options.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-card/75">
              Start with the decision you received. Build a clearer record, prepare the appeal, and decide exactly how you want to send it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-md bg-card px-5 py-3 text-sm font-semibold text-ink">
                Start an Appeal <ArrowRight size={15} />
              </Link>
              <Link to="/workflows" className="inline-flex items-center gap-2 rounded-md border border-card/35 bg-card/5 px-5 py-3 text-sm font-semibold text-card">
                Find My Workflow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
