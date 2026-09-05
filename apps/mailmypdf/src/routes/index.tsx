import { createFileRoute, Link } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  Eye,
  FileText,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Stamp,
  Upload,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ECOSYSTEM_VERTICALS } from "@/lib/ecosystem";
import { mailClassSurchargeUsd, colorPerPageUsd } from "@/lib/pricing";
import {
  SectionHeader,
  CTASection,
  TrustStrip,
  WorkflowCard,
} from "@/components/shared/design-system";

// Lazy on purpose: the SSR bundle has an import cycle between the route-tree
// chunk and the shared-layout chunk, so dereferencing ECOSYSTEM_VERTICALS at
// module-evaluation time reads an uninitialized live binding and 500s every
// request. Deferring to call time lets ESM live bindings resolve correctly.
const workflowVerticals = () => ECOSYSTEM_VERTICALS.filter((vertical) => vertical.slug !== "mail-pdf");
const HOMEPAGE_PRODUCT_TITLES: Record<string, string> = {
  "appeal-reply": "Appeal Mail",
  "records-request": "Records Requests",
};

function homepageProductTitle(slug: string, fallback: string): string {
  return HOMEPAGE_PRODUCT_TITLES[slug] ?? fallback;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MailMyPDF — Turn documents into documented action" },
      {
        name: "description",
        content:
          "Mail a PDF online, respond to important notices, or complete a specialized document workflow. Prepare, review, approve, send, track, and keep proof of important correspondence with MailMyPDF.",
      },
      { property: "og:title", content: "MailMyPDF — Turn documents into documented action" },
      {
        property: "og:description",
        content:
          "Mail a finished PDF or use a specialized workflow to prepare, review, send, track, and keep proof of important correspondence.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: "/hero-document.jpg" },
      { property: "og:image:width", content: "1024" },
      { property: "og:image:height", content: "576" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/hero-document.jpg" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "MailMyPDF",
          description:
            "Online print-and-mail service for important documents with specialized workflows for notices, appeals, immigration correspondence, disputes, records requests, business correspondence, and other document problems.",
          areaServed: "US",
          offers: [
            { "@type": "Offer", name: "Mail a document", price: "4.99", priceCurrency: "USD" },
            {
              "@type": "Offer",
              name: "Certified Mail add-on",
              price: mailClassSurchargeUsd("certified"),
              priceCurrency: "USD",
            },
            {
              "@type": "Offer",
              name: "Registered Mail add-on",
              price: mailClassSurchargeUsd("registered"),
              priceCurrency: "USD",
            },
            {
              "@type": "Offer",
              name: "Color printing add-on",
              price: colorPerPageUsd(),
              priceCurrency: "USD",
            },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "MailMyPDF specialized workflow products",
          itemListElement: workflowVerticals().map((vertical, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: homepageProductTitle(vertical.slug, vertical.title),
            url: vertical.href,
          })),
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <Hero />
        <TrustStrip
          items={[
            {
              icon: <Upload className="h-4 w-4" />,
              label: "No printer required",
              description: "Upload and mail online",
            },
            {
              icon: <Eye className="h-4 w-4" />,
              label: "Approval before mailing",
              description: "Review what will be sent",
            },
            {
              icon: <RouteIcon className="h-4 w-4" />,
              label: "Tracking & proof",
              description: "Available by mailing service",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              label: "Security controls",
              description: "Protected workflows are owner-scoped",
            },
          ]}
        />
        <WaysToUseMailMyPDF />
        <CoreMailingSection />
        <WorkflowDiscovery />
        <ProblemClusterSection />
        <HowItWorks />
        <SecuritySection />
        <Pricing />
        <ProofSection />
        <CTASection
          title="Turn your document into action today."
          subtitle="Mail a finished PDF, or find the specialized workflow built for the situation behind it."
          primaryCTA={{ label: "Mail a PDF", to: "/mail-a-pdf" }}
          secondaryCTA={{ label: "Find a Workflow", to: "/ecosystem" }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule/60">
      <div
        className="absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--paper) 86%, transparent) 0%, color-mix(in oklab, var(--paper) 61%, transparent) 30%, color-mix(in oklab, var(--paper) 92%, transparent) 100%), radial-gradient(circle at 75% 25%, color-mix(in oklab, var(--cobalt) 6%, transparent), transparent 35%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
        <div className="animate-fade-up">
          <div className="postmark w-fit">Mail a document. Respond. Complete the workflow.</div>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
            Turn documents into documented action.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft sm:text-xl">
            Mail a finished PDF, respond to an important document, or complete a specialized
            workflow. MailMyPDF helps you prepare, review, approve, send, track, and keep proof of
            important correspondence.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/mail-a-pdf"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3.5 text-base font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt/90"
            >
              Mail a PDF <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/ecosystem"
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3.5 text-sm font-medium transition-colors hover:border-ink/20 hover:bg-paper-deep"
            >
              Find a Workflow
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Mail from $4.99</span>
            <span>U.S. domestic mail</span>
            <span>No printer required</span>
          </div>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "0.08s" }}>
          <HeroImageVisual />
        </div>
      </div>
    </section>
  );
}

function HeroImageVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
      <div className="relative overflow-hidden rounded-xl border border-rule/40 shadow-xl">
        <picture>
          <source media="(max-width: 639px)" srcSet="/hero-document-mobile.jpg" />
          <img
            src="/hero-document.jpg"
            alt="Important documents prepared for physical mailing"
            className="aspect-[16/10] w-full object-cover"
            loading="eager"
            width={1024}
            height={576}
          />
        </picture>
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, transparent 52%, color-mix(in oklab, var(--paper) 68%, transparent) 100%)",
          }}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-rule bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-cobalt" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            Review before mailing
          </span>
        </div>
      </div>

      <div className="relative -mt-8 mx-auto w-[88%]">
        <ActionFlow />
      </div>
    </div>
  );
}

function ActionFlow() {
  const steps: [string, string, typeof FileText][] = [
    ["Upload", "Add your document", Upload],
    ["Choose", "Mail it or use a workflow", FileText],
    ["Review", "Check the exact packet", Eye],
    ["Send", "Print, address, and mail", Send],
    ["Proof", "Keep tracking and records", ShieldCheck],
  ];

  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up" style={{ animationDelay: "0.1s" }}>
      <div className="absolute -right-3 -top-5 z-10 rotate-3 rounded-full border border-cobalt/25 bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt shadow-sm">
        From screen to mailbox
      </div>
      <div className="envelope-card overflow-hidden p-5 sm:p-6" style={{ transform: "rotate(0.5deg)" }}>
        <div className="flex items-center justify-between border-b border-rule pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Document to action
            </div>
            <div className="mt-1 text-sm font-semibold">You approve what moves forward.</div>
          </div>
          <Stamp className="h-5 w-5 text-cobalt" />
        </div>
        <div className="mt-4 grid gap-2">
          {steps.map(([label, detail, Icon], index) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-rule/70 bg-card/70 px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-deep text-cobalt">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{label}</div>
                <div className="text-[11px] text-muted-foreground">{detail}</div>
              </div>
              {index !== 1 && <Check className="h-3.5 w-3.5 text-cobalt" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaysToUseMailMyPDF() {
  const paths = [
    {
      icon: Mail,
      eyebrow: "MailMyPDF Core",
      title: "Mail a finished document",
      text: "Already have the PDF? Upload it, confirm the address and mailing service, approve the order, and we handle the physical mail.",
      href: "/mail-a-pdf",
      cta: "Mail a PDF",
    },
    {
      icon: FileText,
      eyebrow: "Document response",
      title: "Respond to something you received",
      text: "Start from an official notice, denial, request, dispute, or other document and move into the workflow built for that problem.",
      href: "/ecosystem",
      cta: "Find the right response",
    },
    {
      icon: RouteIcon,
      eyebrow: "Specialized workflows",
      title: "Complete a document-driven process",
      text: "Use guided workflows for appeals, immigration correspondence, records requests, disputes, business mail, and other serious matters.",
      href: "/ecosystem",
      cta: "Explore workflows",
    },
  ];

  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <SectionHeader
          eyebrow="One platform, three ways to move forward"
          title="Start with the document you have — or the problem behind it."
          subtitle="Simple mailing stays simple. More complicated document problems open into purpose-built workflows without leaving the MailMyPDF ecosystem."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {paths.map(({ icon: Icon, eyebrow, title, text, href, cta }) => (
            <article key={title} className="envelope-card envelope-card-hover flex h-full flex-col p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper-deep text-cobalt">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </div>
              <h3 className="mt-2 font-serif text-2xl">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{text}</p>
              <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80">
                {cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoreMailingSection() {
  const steps = [
    [Upload, "Upload your PDF", "Start with a finished document."],
    [Eye, "Review & approve", "Confirm the file, recipient, service, and price."],
    [Mail, "We print & address", "MailMyPDF prepares the physical piece."],
    [Send, "We mail it", "The order keeps the mailing record together."],
  ] as const;

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">MailMyPDF Core</div>
            <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Mail a document from $4.99.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              The simple way to print and mail a PDF online without a printer. Choose the mailing service you need and approve the exact order before it is sent.
            </p>
            <Link
              to="/mail-a-pdf"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              Mail a Document <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map(([Icon, title, text], index) => (
              <div key={title} className="envelope-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-deep text-cobalt">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-serif text-xl">{title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowDiscovery() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Specialized workflows"
            title="Purpose-built help for real document problems."
            subtitle="Each product uses the same MailMyPDF account, document, approval, mailing, tracking, and proof foundation while specializing the workflow for the situation."
          />
          <Link
            to="/ecosystem"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
          >
            View all workflows <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflowVerticals().map((vertical) => (
            <WorkflowCard
              key={vertical.slug}
              href={vertical.href}
              label={vertical.label}
              title={homepageProductTitle(vertical.slug, vertical.title)}
              description={vertical.description}
              capabilities={vertical.capabilities}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemClusterSection() {
  const clusters = [
    {
      title: "Respond to a government notice",
      text: "Understand an IRS, DMV, benefits, code-enforcement, or other official notice and prepare the appropriate documented response.",
      href: "/notice-response",
    },
    {
      title: "Appeal a denial or decision",
      text: "Organize the decision, deadlines, evidence, and written appeal or reconsideration request before mailing it with a record.",
      href: "/appeal-reply",
    },
    {
      title: "Prepare immigration correspondence",
      text: "Work through USCIS notices, RFEs, NOIDs, supporting letters, records requests, and other immigration correspondence.",
      href: "/immigration",
    },
    {
      title: "Dispute debt, billing, credit, or charges",
      text: "Prepare consumer dispute correspondence with the supporting facts, documents, mailing choice, and proof kept together.",
      href: "/dispute-mail",
    },
    {
      title: "Request government or public records",
      text: "Prepare federal FOIA, state public-records, local agency, police, property, permit, and other records requests.",
      href: "/records-request",
    },
    {
      title: "Handle high-stakes private correspondence",
      text: "Build documented correspondence for property, contractor, bank, insurance, trust, deposit, and other serious personal matters.",
      href: "/private-office",
    },
    {
      title: "Manage small-business correspondence",
      text: "Create, approve, schedule, mail, track, and preserve business notices, reminders, demands, compliance documents, and records.",
      href: "/small-business-mail",
    },
    {
      title: "Print and mail a finished PDF",
      text: "Upload a PDF and have it printed and mailed online with Standard, Certified, or Registered options where available.",
      href: "/mail-a-pdf",
    },
  ];

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          eyebrow="What can MailMyPDF help you do?"
          title="Find the path that matches the document in front of you."
          subtitle="MailMyPDF connects simple online mailing with specialized workflows for the situations where the document itself is only the beginning."
        />
        <div className="mt-10 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {clusters.map((cluster) => (
            <Link
              key={cluster.title}
              to={cluster.href}
              className="group border-b border-rule/70 py-5 transition-colors hover:border-cobalt/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl group-hover:text-cobalt">{cluster.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{cluster.text}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-cobalt" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Start with the document",
      text: "Upload a finished PDF for simple mailing, or enter a specialized workflow with the notice, denial, request, or problem you need to handle.",
    },
    {
      number: "02",
      title: "Prepare",
      text: "Add the recipient and the information the selected mailing or workflow needs. Specialized workflows keep the important facts and supporting material organized.",
    },
    {
      number: "03",
      title: "Review",
      text: "Review the document, packet, recipient, mailing service, and price before anything moves forward.",
    },
    {
      number: "04",
      title: "Approve",
      text: "Consequential actions stay approval-gated. You decide what is ready to be mailed.",
    },
    {
      number: "05",
      title: "Mail & track",
      text: "MailMyPDF prints and mails the approved packet. Tracking is kept with the order when the selected service supports it.",
    },
    {
      number: "06",
      title: "Keep proof",
      text: "Keep the document, recipient, mailing service, status, tracking information, and available proof together as a durable record.",
    },
  ];

  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          eyebrow="How MailMyPDF works"
          title="From document to action, with you in control."
          subtitle="The exact workflow changes with the situation. The review, approval, mailing, tracking, and proof principles stay consistent across the ecosystem."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="envelope-card envelope-card-hover p-7">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm font-medium text-cobalt">{step.number}</span>
                <span className="h-px flex-1 bg-rule" />
              </div>
              <h3 className="mt-4 font-serif text-2xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const controls = [
    "Protected workflow files are scoped to the authenticated owner",
    "Uploads remain quarantined until the scanning gate clears them",
    "Workflow disclosures and consequential approvals are recorded server-side",
    "Mailing is held until the exact packet is approved",
    "Retention and deletion controls are exposed through the account experience",
  ];

  return (
    <section id="security" className="proof-surface border-y border-rule/60 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-brass-soft">
              Security & Trust
            </div>
            <h2 className="mt-5 text-3xl leading-tight sm:text-4xl md:text-5xl" style={{ color: "oklch(0.95 0.008 85)" }}>
              Your documents deserve real protection.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7" style={{ color: "oklch(0.72 0.015 85)" }}>
              MailMyPDF uses explicit document, access, scanning, disclosure, approval, and fulfillment boundaries for protected workflows instead of vague security promises.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/privacy"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Privacy <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/retention"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Data Retention
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-8">
            <div className="space-y-4">
              {controls.map((control) => (
                <div key={control} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "oklch(0.45 0.14 255)" }}>
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-sm leading-6" style={{ color: "oklch(0.88 0.01 85)" }}>{control}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
              {["Owner scoped", "Scan gated", "Approval held"].map((label) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/5 px-3 py-3 text-center font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "oklch(0.72 0.015 85)" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          align="center"
          eyebrow="Straightforward core mailing pricing"
          title="Mail a short document from $4.99."
          subtitle="Core mailing pricing is separate from specialized workflow preparation. Choose the mailing service and options you need during checkout; the price is shown before you approve the order."
        />
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-rule px-3 py-1.5">Standard mail</span>
          <span className="rounded-full border border-rule px-3 py-1.5">Certified Mail available</span>
          <span className="rounded-full border border-rule px-3 py-1.5">Registered Mail available</span>
          <span className="rounded-full border border-rule px-3 py-1.5">Color printing available</span>
        </div>
        <div className="mt-7 flex justify-center gap-4">
          <Link to="/pro" className="inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80">
            See full pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProofSection() {
  const items: [typeof ShieldCheck, string, string][] = [
    [
      FileText,
      "The document",
      "Keep the document that was prepared or uploaded with the order or matter that produced it.",
    ],
    [
      MapPin,
      "The destination",
      "Keep the recipient and mailing-service selection connected to the document that was approved.",
    ],
    [
      RouteIcon,
      "Tracking when available",
      "Certified and Registered services preserve available carrier tracking and delivery information with the mailing record.",
    ],
    [
      ShieldCheck,
      "A durable record",
      "Keep the important mailing details together instead of reconstructing what happened from separate systems later.",
    ],
  ];

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          eyebrow="Tracking & proof"
          title="Know what was sent, where it went, and what happened next."
          subtitle="MailMyPDF is designed to keep the document and its mailing record connected, with tracking and delivery information preserved when the selected service provides it."
        />
        <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {items.map(([Icon, title, text]) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule bg-card text-cobalt">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
