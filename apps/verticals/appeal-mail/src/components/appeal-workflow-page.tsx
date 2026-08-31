import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, ShieldCheck, Eye, Mail, PackageCheck, FileText, Search, Lightbulb, FolderOpen } from "lucide-react";
import { PRICES } from "@mailmypdf/pricing";
import type { ReactNode } from "react";
import type { AppealWorkflowEntry } from "@/domain/appeal-catalog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Shared AppealWorkflowPage — upgraded to CP2000 design standard.
 *
 * Sections:
 * 1. Hero (breadcrumb, badge, H1, subheadline, CTA, key facts grid)
 * 2. Problem/context (longDescription + intendedUser + problemSolved)
 * 3. How it works (3-step process)
 * 4. What we analyze / What you need (InfoCards grid)
 * 5. What we identify / What appeal addresses (InfoCards grid)
 * 6. Trust band
 * 7. Pricing
 * 8. FAQ
 * 9. Final CTA
 *
 * No placeholder images. No generic copy. Domain-specific throughout.
 */

interface AppealWorkflowPageProps {
  workflow: AppealWorkflowEntry;
  productName?: string;
  productHomePath?: string;
  relatedWorkflows?: { slug: string; title: string; shortDescription: string }[];
}

export function AppealWorkflowPage({
  workflow,
  productName = "Appeal Mail",
  productHomePath = "/",
  relatedWorkflows = [],
}: AppealWorkflowPageProps) {
  const isExecutable = workflow.executable === true;
  const startRoute = workflow.workflowRoute || "/workflows/denied-claim";

  // Generate FAQ from workflow data — domain-specific, not generic
  const faqItems = generateFAQ(workflow, productName);

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <main>
        {/* ── HERO ── */}
        <section className="relative overflow-hidden border-b border-rule/60">
          <div className="absolute inset-0 bg-gradient-to-b from-paper-deep/40 via-paper to-paper" aria-hidden="true" />
          <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
              <Link to={productHomePath} className="hover:text-stamp transition-colors">{productName}</Link>
              <span className="text-rule">/</span>
              <Link to="/workflows" className="hover:text-stamp transition-colors">Workflows</Link>
              <span className="text-rule">/</span>
              <span className="text-ink-soft">{workflow.title}</span>
            </nav>
            <div className="postmark w-fit mt-6">{workflow.category}</div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.1] sm:text-5xl md:text-6xl">
              {workflow.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
              {workflow.shortDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isExecutable ? (
                <Link
                  to={startRoute}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
                >
                  {workflow.cta || "Start this workflow"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium text-muted-foreground">
                  Coming soon
                </span>
              )}
              <Link
                to="/workflows"
                className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:border-ink/30"
              >
                Browse other workflows
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule/60 bg-rule/60 sm:grid-cols-4">
              <KeyFact label="Category" value={workflow.category} />
              <KeyFact label="Status" value={isExecutable ? "Available" : "Guide"} />
              <KeyFact label="Recommended mail" value="Certified" />
              <KeyFact label="Preparation from" value={`$${(PRICES.standard / 100).toFixed(2)}`} />
            </div>
          </div>
        </section>

        {/* ── PROBLEM / CONTEXT ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Understanding the situation
            </div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">
              {workflow.problemSolved}
            </h2>
            <div className="mt-6 space-y-4 text-base leading-7 text-ink-soft">
              <p>{workflow.longDescription}</p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-ink">Who this is for:</strong> {workflow.intendedUser}
              </p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              The process
            </div>
            <h2 className="mt-3 font-serif text-3xl leading-tight">How {productName} works</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <ProcessStep
                number="01"
                title="Upload & analyze"
                text={`Upload your denial or decision letter. ${productName} extracts the key facts, deadlines, stated reasons, and policy or regulatory references — then identifies what needs your attention.`}
              />
              <ProcessStep
                number="02"
                title="Review & draft"
                text="See the extracted issues alongside your evidence. Add supporting documents. Generate a structured appeal that addresses each reason. Edit anything before approval."
              />
              <ProcessStep
                number="03"
                title="Mail with proof"
                text="Approve the exact draft. Choose Certified mail for proof of timely delivery. MailMyPDF prints, stamps, and ships — you keep the tracking number and delivery confirmation."
              />
            </div>
          </div>
        </section>

        {/* ── WHAT WE ANALYZE / WHAT YOU NEED ── */}
        <section className="border-b border-rule/60 bg-paper-deep/25">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-6 md:grid-cols-2">
              <InfoCard icon={<Search className="h-[18px] w-[18px]" />} title="What we analyze" items={workflow.whatWeAnalyze} />
              <InfoCard icon={<FolderOpen className="h-[18px] w-[18px]" />} title="What you'll need" items={workflow.whatYouNeed} />
              <InfoCard icon={<Lightbulb className="h-[18px] w-[18px]" />} title={`What ${productName} identifies`} items={workflow.whatWeIdentify} />
              <InfoCard icon={<FileText className="h-[18px] w-[18px]" />} title="What your appeal can address" items={workflow.whatAppealAddresses} />
            </div>
          </div>
        </section>

        {/* ── TRUST BAND ── */}
        <section className="border-y border-rule/60 bg-ink text-paper">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="inline-flex items-center gap-0.4rem border border-stamp/40 px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.15em] text-stamp rounded-full">
              Trust architecture
            </div>
            <h2 className="mt-5 font-serif text-3xl text-paper">You stay in control of every step.</h2>
            <p className="mt-4 text-base leading-7 text-paper/70">
              The decision letter is the source material. Your evidence remains under your control. AI assists — it does not decide. You review the appeal before approval. Approval applies to the exact draft. Mailing creates a documented record.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <TrustItem title="Your data, your control" text="Documents are processed for analysis. Nothing is shared with third parties." />
              <TrustItem title="Review before send" text="You approve the exact document. Nothing is mailed without your explicit confirmation." />
              <TrustItem title="Proof of delivery" text="Certified mail provides tracking and delivery confirmation — your record of timely response." />
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pricing</div>
            <h2 className="mt-3 font-serif text-3xl">Clear pricing. No subscriptions.</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-rule/60 bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Preparation</div>
                <div className="mt-2 font-serif text-3xl text-ink">Included</div>
                <p className="mt-2 text-sm text-muted-foreground">Analysis, issue identification, evidence organization, and appeal drafting.</p>
              </div>
              <div className="rounded-lg border border-rule/60 bg-card p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-stamp">Mailing</div>
                <div className="mt-2 space-y-2">
                  <PriceRow label="Standard" price={`$${(PRICES.standard / 100).toFixed(2)}`} desc="3–7 business days" />
                  <PriceRow label="Certified" price={`$${(PRICES.certified / 100).toFixed(2)}`} desc="Tracking + confirmation" />
                  <PriceRow label="Registered" price={`$${(PRICES.registered / 100).toFixed(2)}`} desc="Secure handling" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Preparation and mailing are separate. You review and approve before anything is sent.
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Questions & answers
            </div>
            <h2 className="mt-3 font-serif text-3xl">Frequently asked questions</h2>
            <div className="mt-6 space-y-4">
              {faqItems.map((item, i) => (
                <div key={i} className="rounded-lg border border-rule bg-card p-5">
                  <h3 className="font-medium text-foreground">{item.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-6">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RELATED WORKFLOWS ── */}
        {relatedWorkflows.length > 0 && (
          <section className="border-b border-rule/60">
            <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Related workflows
              </div>
              <h2 className="mt-3 font-serif text-2xl">Other appeal types</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {relatedWorkflows.slice(0, 3).map((rw) => (
                  <Link
                    key={rw.slug}
                    to="/appeal/$slug"
                    params={{ slug: rw.slug }}
                    className="block rounded-lg border border-rule/60 bg-card p-4 transition-colors hover:border-stamp/40"
                  >
                    <div className="font-medium text-foreground">{rw.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{rw.shortDescription}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-6">
                <Link to="/workflows" className="text-sm text-stamp hover:text-ink transition-colors">
                  Browse all workflows →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── FINAL CTA ── */}
        <section className="border-t border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-20">
            <div className="postmark mx-auto w-fit">AI assistance. Human approval.</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">
              The system does the heavy lifting. You approve the result.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {productName} can analyze the decision, organize evidence, surface gaps, and prepare a draft. You remain responsible for your facts and approve the exact correspondence before mailing.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {isExecutable && (
                <Link
                  to={startRoute}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <Mail className="h-4 w-4" />
                  {workflow.cta || "Start this workflow"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/workflows"
                className="inline-flex items-center gap-2 rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink"
              >
                Browse workflows
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function KeyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper p-3 text-center">
      <div className="font-serif text-lg text-ink">{value}</div>
      <div className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function ProcessStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div>
      <div className="font-mono text-xs font-semibold text-stamp">{number}</div>
      <h3 className="mt-2 font-serif text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{text}</p>
    </div>
  );
}

function InfoCard({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-rule bg-card p-6 shadow-card">
      <div className="flex items-center gap-2 text-stamp">
        {icon}
        <h3 className="font-serif text-xl text-foreground">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stamp" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-paper/15 p-4">
      <h3 className="font-medium text-paper">{title}</h3>
      <p className="mt-1.5 text-sm text-paper/60">{text}</p>
    </div>
  );
}

function PriceRow({ label, price, desc }: { label: string; price: string; desc: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <span className="font-medium text-foreground">{label}</span>
        <span className="ml-2 text-muted-foreground">{desc}</span>
      </div>
      <span className="font-medium text-foreground">{price}</span>
    </div>
  );
}

// ── FAQ Generation ─────────────────────────────────────────────────────────

function generateFAQ(workflow: AppealWorkflowEntry, productName: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [
    {
      question: `What does this workflow do?`,
      answer: `${productName} analyzes your ${workflow.category.toLowerCase()} decision, identifies the stated reasons, organizes your evidence, and helps you prepare a structured appeal. You review and approve the draft before anything is mailed.`,
    },
    {
      question: `What documents should I provide?`,
      answer: workflow.whatYouNeed.length > 0
        ? `You should provide: ${workflow.whatYouNeed.slice(0, 4).join(", ")}${workflow.whatYouNeed.length > 4 ? ", and any other relevant correspondence." : "."}`
        : "Provide the denial or decision letter and any supporting documents related to your case.",
    },
    {
      question: `How does the appeal get prepared?`,
      answer: `Upload your decision letter. ${productName} extracts the key facts, identifies the stated reasons, and analyzes your evidence against them. The system then drafts a point-by-point response you can review and edit.`,
    },
    {
      question: `Can I change the draft?`,
      answer: "Yes. You review the draft before anything is sent. You can edit the content, add or remove sections, and approve only when you're satisfied with the result.",
    },
    {
      question: `Do I have to mail it?`,
      answer: "No. Mailing is optional. You can download the prepared document and submit it yourself, or choose Standard, Certified, or Registered mail through MailMyPDF for tracking and proof of delivery.",
    },
    {
      question: `How much does it cost?`,
      answer: `Mailing starts at $${(PRICES.standard / 100).toFixed(2)} for Standard, $${(PRICES.certified / 100).toFixed(2)} for Certified (with tracking and delivery confirmation), and $${(PRICES.registered / 100).toFixed(2)} for Registered mail. Preparation and mailing are separate — you approve before anything is sent.`,
    },
    {
      question: `Is this legal advice?`,
      answer: `No. ${productName} is a correspondence tool, not a law firm. We help you organize your documents and prepare a written appeal — we do not provide legal advice or guarantee any outcome.`,
    },
  ];

  return faqs;
}
