import { createFileRoute, Link } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import {
  ArrowRight,
  Check,
  FileText,
  Mail,
  MapPin,
  ShieldCheck,
  Stamp,
  Upload,
  Eye,
  Send,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MailMyPDF — Turn documents into documented action" },
      {
        name: "description",
        content:
          "Upload a PDF or write a letter, prepare the mailing, choose your service, and send it through the U.S. mail. Certified and Registered options, tracking where applicable, and a clear mailing record — plus specialized workflows for complex document problems.",
      },
      { property: "og:title", content: "MailMyPDF — Turn documents into documented action" },
      {
        property: "og:description",
        content:
          "Upload a document, prepare your mailing, and send it through the mail with tracking and a clear record of what you sent.",
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
            "Online print-and-mail service for important documents and specialized document workflows.",
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
              label: "Documents",
              description: "Upload or write",
            },
            {
              icon: <Mail className="h-4 w-4" />,
              label: "Mailing",
              description: "Printed and mailed",
            },
            {
              icon: <RouteIcon className="h-4 w-4" />,
              label: "Tracking",
              description: "Where applicable",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              label: "Proof",
              description: "Mailing record",
            },
          ]}
        />
        <AuthorityStrip />
        <CategorySection />
        <PopularWorkflows />
        <HowItWorks />
        <ProofSection />
        <Pricing />
        <TrustSection />
        <CTASection
          title="Ready to send?"
          subtitle="Start with a finished document. If you need help with the problem behind the document, explore the specialized workflows."
          primaryCTA={{ label: "Send a Document", to: "/send" }}
          secondaryCTA={{ label: "Explore Workflows", to: "/ecosystem" }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-rule/60">
      {/* Premium generated background */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      {/* Gradient wash for depth */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--paper) 85%, transparent) 0%, color-mix(in oklab, var(--paper) 60%, transparent) 30%, color-mix(in oklab, var(--paper) 90%, transparent) 100%), radial-gradient(circle at 75% 25%, color-mix(in oklab, var(--cobalt) 6%, transparent), transparent 35%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        {/* Left: copy */}
        <div className="animate-fade-up">
          <div className="postmark w-fit">Professional document delivery, proven</div>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
            Mail important documents. Get real results.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft sm:text-xl">
            Send finished documents with proof of delivery. MailMyPDF provides the mailing layer for
            agencies, law firms, and individuals who need reliable correspondence with documented proof.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/send"
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3.5 text-base font-medium text-white shadow-stamp transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt/90"
            >
              Send a Document <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/ecosystem"
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3.5 text-sm font-medium transition-colors hover:border-ink/20 hover:bg-paper-deep"
            >
              Explore Workflows
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>From $4.99</span>
            <span>U.S. domestic mail</span>
            <span>No printer required</span>
          </div>
        </div>

        {/* Right: hero image + product visual stack */}
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
      {/* Hero photograph */}
      <div className="relative overflow-hidden rounded-lg border border-rule/40 shadow-xl">
        <img
          src="/hero-document.jpg"
          alt="Documents becoming professional correspondence"
          className="aspect-[16/10] w-full object-cover"
          loading="eager"
          width={1024}
          height={576}
        />
        {/* Subtle ivory wash at bottom for text legibility */}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, transparent 55%, color-mix(in oklab, var(--paper) 75%, transparent) 100%)",
          }}
        />
        {/* Proof badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-rule bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-cobalt" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Proof of mailing
          </span>
        </div>
      </div>

      {/* Mailing flow card overlapping below */}
      <div className="relative -mt-8 mx-auto w-[88%]">
        <MailingFlow />
      </div>
    </div>
  );
}

function MailingFlow() {
  const steps: [string, string, typeof FileText][] = [
    ["PDF", "Your document", FileText],
    ["Mail", "Printed & sent", Mail],
    ["Track", "Follow delivery", RouteIcon],
    ["Proof", "Mailing record", ShieldCheck],
  ];

  return (
    <div
      className="relative mx-auto w-full max-w-md animate-fade-up"
      style={{ animationDelay: "0.1s" }}
    >
      {/* Floating stamp label */}
      <div className="absolute -right-3 -top-5 z-10 rotate-6 rounded-full border border-cobalt/25 bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt shadow-sm">
        MailMyPDF
      </div>

      <div
        className="envelope-card overflow-hidden p-6 sm:p-8"
        style={{ transform: "rotate(1deg)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-rule pb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Your document
            </div>
            <div className="mt-2 text-lg font-semibold">Important correspondence.pdf</div>
            <div className="mt-1 text-xs text-muted-foreground">4 pages · ready to mail</div>
          </div>
          <div className="rounded-full border border-rule p-2 text-cobalt">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* Flow steps */}
        <div className="py-6">
          {steps.map(([label, detail, Icon], index) => (
            <div key={label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    index === 3
                      ? "bg-cobalt text-white"
                      : index === 2
                        ? "bg-ink text-paper"
                        : "border border-rule bg-card text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`h-10 w-px ${index < 2 ? "bg-rule" : "bg-cobalt/30"}`} />
                )}
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-cobalt" />
                  <div className="text-sm font-semibold">{label}</div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-rule pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-cobalt" /> Mailing record kept together
          </div>
          <Stamp className="h-5 w-5 text-cobalt" />
        </div>
      </div>
    </div>
  );
}

/* ── Category Section ──────────────────────────────────────────────────────── */

function CategorySection() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeader
              eyebrow="The category"
              title="Email sends information. MailMyPDF creates a record."
              subtitle="A digital document becomes physical correspondence — tracked, documented, and preserved as a durable communication record."
            />
          </div>
          <div className="grid gap-4">
            {[
              {
                icon: FileText,
                title: "Digital document",
                text: "Upload a finished PDF or write a letter from scratch.",
              },
              {
                icon: Mail,
                title: "Physical correspondence",
                text: "We print and mail it through the U.S. mail — no printer needed.",
              },
              {
                icon: RouteIcon,
                title: "Tracking",
                text: "Follow delivery status when you choose Certified or Registered Mail.",
              },
              {
                icon: ShieldCheck,
                title: "Proof",
                text: "Keep the document, recipient, service, and mailing record together in one place.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rule bg-card text-cobalt">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ──────────────────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Answer Questions",
      text: "We ask a few simple questions about your situation.",
    },
    {
      number: "02",
      icon: FileText,
      title: "We Build Your Documents",
      text: "Our AI creates professional, personalized documents for you.",
    },
    {
      number: "03",
      icon: FileText,
      title: "You Approve",
      text: "Review your documents and approve with confidence.",
    },
    {
      number: "04",
      icon: FileText,
      title: "We Mail & You Get Proof",
      text: "We print, package, and mail your documents with tracking.",
    },
  ];

  return (
    <section className="border-b border-rule/60 bg-ink">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
            How MailMyPDF Works
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brass/40">
                <span className="font-serif text-2xl text-brass">{step.number}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="mt-4 mb-4 hidden h-12 w-px bg-brass/20 lg:block" />
              )}
              <h3 className="mt-6 font-serif text-lg text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/60">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Workflow Discovery ─────────────────────────────────────────────────────── */

function WorkflowDiscovery() {
  const categories = [
    {
      title: "Disputes & Appeals",
      description: "Challenge decisions with evidence-backed correspondence.",
      slugs: ["appeal-reply", "dispute-mail"],
    },
    {
      title: "Professional Correspondence",
      description: "High-stakes matters — disputes, claims, and notices with evidence and approval gates.",
      slugs: ["private-office"],
    },
    {
      title: "Immigration",
      description: "USCIS notices, RFE responses, records requests, and supporting letters.",
      slugs: ["immigration-mail"],
    },
    {
      title: "Records & FOIA",
      description: "Federal, state, and local public-records requests with certified mailing.",
      slugs: ["records-request"],
    },
    {
      title: "Notices & Responses",
      description: "Understand official notices and prepare documented responses.",
      slugs: ["notice-respond"],
    },
    {
      title: "Business",
      description: "Create, schedule, track, and prove business correspondence with team approvals.",
      slugs: ["small-business-mail"],
    },
  ];

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="The workflow ecosystem"
            title="Specialized workflows for specific document problems."
            subtitle="When the problem is more complicated than 'send this PDF,' MailMyPDF connects you to a purpose-built workflow for the job."
          />
          <Link
            to="/ecosystem"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
          >
            Explore all workflows <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 space-y-8">
          {categories.map((category) => {
            const verticals = category.slugs
              .map((slug) => ECOSYSTEM_VERTICALS.find((v) => v.slug === slug))
              .filter((v): v is NonNullable<typeof v> => Boolean(v));

            return (
              <div key={category.title}>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl">{category.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {verticals.map((vertical) => (
                    <WorkflowCard
                      key={vertical.slug}
                      href={vertical.href}
                      label={vertical.label}
                      title={vertical.title}
                      description={vertical.description}
                      capabilities={vertical.capabilities}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Proof Section ──────────────────────────────────────────────────────────── */

function ProofSection() {
  const statuses = [
    { label: "Sent", description: "Document submitted for mailing", active: true },
    { label: "Accepted", description: "Mailing accepted by the carrier", active: true },
    { label: "Delivered", description: "Delivery confirmed when available", active: true },
    { label: "Proof", description: "Mailing record preserved", active: true },
  ];

  return (
    <section className="proof-surface border-y border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-brass-soft">
              Proof
            </div>
            <h2
              className="mt-5 text-3xl leading-tight sm:text-4xl md:text-5xl"
              style={{ color: "oklch(0.95 0.008 85)" }}
            >
              When it matters, proof matters.
            </h2>
            <p
              className="mt-5 max-w-xl text-base leading-7"
              style={{ color: "oklch(0.72 0.015 85)" }}
            >
              Every order keeps the document, recipient, mailing service, tracking, and status
              together. When you choose Certified or Registered Mail, delivery information is
              preserved with your order.
            </p>
            <Link
              to="/proof-of-mailing"
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Learn about proof of mailing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <div className="mb-6 flex items-center justify-between">
              <div
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: "oklch(0.72 0.015 85)" }}
              >
                Mailing record
              </div>
              <Stamp className="h-5 w-5" style={{ color: "oklch(0.66 0.07 75)" }} />
            </div>
            <div className="space-y-1">
              {statuses.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                      style={{
                        background: step.active ? "oklch(0.45 0.14 255)" : "transparent",
                        border: step.active ? "none" : "1px solid oklch(0.35 0.02 255)",
                        color: step.active ? "white" : "oklch(0.6 0.01 85)",
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {i < statuses.length - 1 && (
                      <div className="h-12 w-px" style={{ background: "oklch(0.35 0.02 255)" }} />
                    )}
                  </div>
                  <div className="pb-6">
                    <div className="text-sm font-medium" style={{ color: "oklch(0.95 0.008 85)" }}>
                      {step.label}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "oklch(0.72 0.015 85)" }}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Authority Strip ───────────────────────────────────────────────────────── */

function AuthorityStrip() {
  const authorities = [
    "Government agencies",
    "Law firms & paralegals",
    "Immigration attorneys",
    "Nonprofits",
    "Appeals advocates",
  ];

  return (
    <section className="border-b border-rule/60 bg-paper-deep/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Used by
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {authorities.map((auth) => (
              <div key={auth} className="flex items-center gap-2 text-sm text-ink-soft">
                <div className="h-1.5 w-1.5 rounded-full bg-brass" />
                {auth}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Popular Workflows ─────────────────────────────────────────────────────── */

function PopularWorkflows() {
  // Select 5 featured workflows strategically based on mockup
  // These represent the most common use cases: tax, immigration, code enforcement, and disputes
  const featuredSlugs = [
    "notice-respond",           // IRS CP2000 & CP14 Response
    "immigration-mail",         // USCIS I-797 Response
    "records-request",          // Code Enforcement Records Request
    "dispute-mail",             // Dispute a Debt
    "appeal-reply",             // Appeals (5th featured workflow)
  ];

  const workflows = ECOSYSTEM_VERTICALS.filter((v) =>
    featuredSlugs.includes(v.slug)
  );

  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Popular workflows"
            title="Specialized workflows for document problems."
            subtitle="When you need more than document delivery, choose a purpose-built workflow for complex correspondence."
          />
          <Link
            to="/ecosystem"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
          >
            See all workflows <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {workflows.map((vertical) => (
            <WorkflowCard
              key={vertical.slug}
              href={vertical.href}
              label={vertical.label}
              title={vertical.title}
              description={vertical.description}
              capabilities={vertical.capabilities}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ────────────────────────────────────────────────────────────────── */

function Pricing() {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          align="center"
          eyebrow="Straightforward pricing"
          title="Mail a short document from $4.99."
          subtitle="Choose the mailing service and options you need during checkout. Pricing is shown before you send — no hidden fees."
        />
        <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-rule px-3 py-1.5">
            Certified Mail available
          </span>
          <span className="rounded-full border border-rule px-3 py-1.5">
            Registered Mail available
          </span>
          <span className="rounded-full border border-rule px-3 py-1.5">
            Color printing available
          </span>
        </div>
        <div className="mt-6">
          <Link
            to="/pro"
            className="inline-flex items-center gap-2 text-sm font-medium text-cobalt hover:text-cobalt/80"
          >
            See full pricing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Trust / Security ──────────────────────────────────────────────────────── */

function TrustSection() {
  const items: [typeof ShieldCheck, string, string][] = [
    [
      ShieldCheck,
      "Documents handled with care",
      "Your document is prepared and mailed with the same attention you'd give it yourself.",
    ],
    [
      FileText,
      "A clear mailing record",
      "Keep the document, recipient, mailing service, tracking, and order status together in one place.",
    ],
    [
      MapPin,
      "Address verification",
      "We verify the recipient address before the mailing goes out to reduce returns and delays.",
    ],
    [
      Check,
      "You stay in control",
      "Review the document, address, and mailing service before you pay. Nothing is sent until you confirm.",
    ],
  ];

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeader
          eyebrow="Built for important documents"
          title="Trust your document to a service that takes it seriously."
        />
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
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
