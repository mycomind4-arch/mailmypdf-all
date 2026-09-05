import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, FileCheck2, FileText, Mail, Search, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TrustStrip } from "@/components/shared/design-system";
import type { WorkflowAuthorityPageData } from "@/lib/workflow-authority-registry";

type Props = {
  page: WorkflowAuthorityPageData;
};

const APPROACH_STEPS = [
  {
    title: "Read the source document",
    description: "Start with the notice, decision, request, agreement, or other document that controls what happens next.",
  },
  {
    title: "Confirm facts and timing",
    description: "Preserve names, dates, identifiers, instructions, and stated deadlines exactly as they appear in the source material.",
  },
  {
    title: "Organize supporting material",
    description: "Gather only the records and evidence that actually support the issue, request, or response you are preparing.",
  },
  {
    title: "Prepare and review",
    description: "Build the correspondence or packet, then review the exact document and attachments before anything moves forward.",
  },
  {
    title: "Send and preserve the record",
    description: "Follow the controlling delivery instructions and keep the final packet, order, tracking, and available proof together.",
  },
] as const;

export function WorkflowAuthorityPage({ page }: Props) {
  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main>
        <Hero page={page} />

        <TrustStrip
          items={[
            {
              icon: <Search className="h-4 w-4" />,
              label: "Start with the source",
              description: "Use the actual notice, decision, or instructions",
            },
            {
              icon: <FileCheck2 className="h-4 w-4" />,
              label: "Keep facts reviewable",
              description: "Separate source facts from assumptions",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              label: "You approve the packet",
              description: "Review the exact document before mailing",
            },
            {
              icon: <Mail className="h-4 w-4" />,
              label: "Keep the mailing record",
              description: "Tracking and proof depend on mailing service",
            },
          ]}
        />

        <section className="border-b border-rule/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
            <UseCard
              eyebrow="When this page is useful"
              title={`When to use ${page.title.toLowerCase()}`}
              items={page.whenToUse}
              positive
            />
            <UseCard
              eyebrow="Know the boundary"
              title="When to use a different path"
              items={page.whenNotToUse}
            />
          </div>
        </section>

        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">Documents & information</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight">What to gather before you prepare anything.</h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
                  A strong document workflow starts with the material that actually controls the situation. Do not fill gaps with guesses. If a rule, deadline, address, or requirement matters, confirm it from the current source document or an authoritative source.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {page.checklist.map((item, index) => (
                  <article key={item} className="envelope-card p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule bg-paper-deep font-mono text-[10px] text-cobalt">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-6">{item}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-rule/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">A consistent workflow model</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">From the document in front of you to a reviewable record.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The subject changes from workflow to workflow. The quality controls should not. MailMyPDF uses the same preparation pattern across the ecosystem so the important facts, evidence, approval, and mailing record stay visible.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-5">
              {APPROACH_STEPS.map((step, index) => (
                <article key={step.title} className="envelope-card p-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 font-serif text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TimingAndMailing />
        <SourceSection page={page} />
        <QuestionSection page={page} />
        <RelatedSection page={page} />

        <section className="border-b border-rule/60 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55">Continue in {page.product}</p>
              <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Use the workflow family built for this kind of document problem.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-paper/70">
                This page explains what to gather and verify. The product hub is where you can see the available workflows and choose the next step that matches your document.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to={page.productHref}
                className="inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
              >
                Explore {page.product} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/mail-a-pdf"
                className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-6 py-3 text-sm font-medium text-paper hover:bg-paper/10"
              >
                Mail a finished PDF
              </Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <p className="max-w-4xl text-xs leading-6 text-muted-foreground">
              MailMyPDF is a document-preparation and mailing platform, not a government agency or law firm. This page is general information, not legal advice. Requirements, deadlines, filing methods, and acceptable delivery methods can vary by agency, program, contract, court, jurisdiction, and the document you received. Follow the current controlling instructions and seek qualified professional help when your situation requires it.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero({ page }: Props) {
  const firstItems = page.checklist.slice(0, 3);
  return (
    <section className="relative overflow-hidden border-b border-rule/60">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 78% 20%, color-mix(in oklab, var(--cobalt) 9%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in oklab, var(--paper-deep) 52%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link to="/">MailMyPDF</Link>
          <span>/</span>
          <Link to={page.productHref}>{page.product}</Link>
          <span>/</span>
          <span aria-current="page">{page.title}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div className="postmark w-fit">{page.product} · {page.pipeline}</div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.01] sm:text-6xl lg:text-7xl">{page.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-soft sm:text-xl">{page.overview}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={page.productHref}
                className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3.5 text-sm font-medium text-white shadow-stamp transition-transform hover:-translate-y-0.5"
              >
                Explore {page.product} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/mail-a-pdf"
                className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3.5 text-sm font-medium hover:bg-paper-deep"
              >
                Already finished? Mail the PDF
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>Source-first preparation</span>
              <span>Review before mailing</span>
              {page.reviewedAt && <span>Sources reviewed {page.reviewedAt}</span>}
            </div>
          </div>

          <aside className="envelope-card overflow-hidden">
            <div className="border-b border-rule bg-paper-deep/40 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Start with the record</p>
              <h2 className="mt-1 font-serif text-2xl">What matters before you respond.</h2>
            </div>
            <div className="grid gap-0">
              {firstItems.map((item, index) => (
                <div key={item} className="flex gap-3 border-b border-rule/60 px-5 py-4 last:border-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-deep text-cobalt">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Check {index + 1}</div>
                    <p className="mt-1 text-sm leading-6">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function UseCard({ eyebrow, title, items, positive = false }: { eyebrow: string; title: string; items: string[]; positive?: boolean }) {
  return (
    <article className="envelope-card p-6 sm:p-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl">{title}</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
            <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${positive ? "bg-paper-deep text-cobalt" : "border border-rule text-muted-foreground"}`}>
              {positive ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function TimingAndMailing() {
  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <article className="envelope-card p-6 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Deadlines & timing</p>
          <h2 className="mt-2 font-serif text-3xl">Use the deadline that actually controls your matter.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Do not substitute a generic web deadline for the date or instruction in the document you received. Confirm the current rule, what event starts the clock, whether receipt or postmark matters, and what to do when the instructions conflict or are unclear.
          </p>
        </article>
        <article className="envelope-card p-6 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cobalt">Mailing, tracking & proof</p>
          <h2 className="mt-2 font-serif text-3xl">Choose delivery after you know the submission rule.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Standard, tracked, Certified, or other mailing services can create different records. The right choice depends on the recipient's instructions and the purpose of the mailing. A mailing receipt or tracking event does not by itself prove that every legal, court, agency, or contractual filing requirement was satisfied.
          </p>
        </article>
      </div>
    </section>
  );
}

function SourceSection({ page }: Props) {
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">Official sources & freshness</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight">Verify the rule before you rely on it.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            These links are starting points for checking current official guidance. The source document you received, the responsible agency or organization, and current jurisdiction-specific rules control when they differ from general information on this page.
          </p>
        </div>

        {page.sources.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {page.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="envelope-card envelope-card-hover block p-5"
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{source.publisher}</p>
                <h3 className="mt-2 font-serif text-xl leading-snug">{source.title}</h3>
                <p className="mt-3 text-xs text-muted-foreground">Reviewed {source.reviewedAt}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-rule bg-paper-deep/30 p-6 text-sm leading-7 text-muted-foreground">
            No workflow-specific source set is published on this page yet. Use the controlling document and the responsible official organization before relying on any deadline or requirement.
          </div>
        )}
      </div>
    </section>
  );
}

function QuestionSection({ page }: Props) {
  const questions = page.faqPairs.length > 0 ? page.faqPairs.map((item) => item.question) : page.faqQuestions.filter((item) => item.trim().endsWith("?"));
  if (questions.length === 0) return null;

  return (
    <section className="border-b border-rule/60 bg-paper-deep/20">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">Questions to resolve</p>
        <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight">Questions people commonly need answered before moving forward.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {page.faqPairs.length > 0
            ? page.faqPairs.map((item) => (
                <article key={item.question} className="envelope-card p-6">
                  <h3 className="font-serif text-xl">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
                </article>
              ))
            : questions.map((question) => (
                <article key={question} className="envelope-card p-6">
                  <h3 className="font-serif text-xl">{question}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Confirm this from the source document and current official instructions for your specific situation rather than relying on a universal answer.
                  </p>
                </article>
              ))}
        </div>
      </div>
    </section>
  );
}

function RelatedSection({ page }: Props) {
  if (page.related.length === 0) return null;
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">Related {page.product} workflows</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">Keep exploring within the same problem family.</h2>
          </div>
          <Link to={page.productHref} className="inline-flex items-center gap-2 text-sm font-medium text-cobalt">
            View {page.product} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {page.related.map((item) => (
            <Link key={item.href} to={item.href} className="envelope-card envelope-card-hover flex h-full flex-col p-5">
              <h3 className="font-serif text-xl leading-snug">{item.title}</h3>
              <p className="mt-3 line-clamp-5 flex-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cobalt">
                Learn more <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
