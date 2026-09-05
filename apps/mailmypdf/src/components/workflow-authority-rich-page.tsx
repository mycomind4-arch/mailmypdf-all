import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  FileText,
  Link2,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { TrustStrip } from "@/components/shared/design-system";
import type { WorkflowAuthorityPageData } from "@/lib/workflow-authority-registry";
import type { WorkflowSeoAuthorityContent } from "@/lib/workflow-seo-catalog";

type RichPage = WorkflowAuthorityPageData & { authority: WorkflowSeoAuthorityContent };

type Props = { page: RichPage };

export function WorkflowAuthorityRichPage({ page }: Props) {
  const content = page.authority;
  const primaryHref = page.executionHref ?? page.productHref;
  const primaryLabel = page.executionHref ? "Start workflow" : `Find this workflow in ${page.product}`;

  return (
    <div className="min-h-screen bg-paper text-foreground">
      <SiteHeader />
      <main>
        <Hero page={page} primaryHref={primaryHref} primaryLabel={primaryLabel} />

        <TrustStrip
          items={[
            {
              icon: <Search className="h-4 w-4" />,
              label: "Source-first guidance",
              description: "Start with the controlling document and current authority",
            },
            {
              icon: <FileSearch className="h-4 w-4" />,
              label: "Workflow-specific checks",
              description: "Know what to inspect, gather, and verify",
            },
            {
              icon: <ShieldCheck className="h-4 w-4" />,
              label: "No invented facts",
              description: "Deadlines and requirements stay tied to real sources",
            },
            {
              icon: <Mail className="h-4 w-4" />,
              label: "Preserve the record",
              description: "Keep final documents and available mailing proof together",
            },
          ]}
        />

        <TwoColumnIntro page={page} />

        <AuthoritySection eyebrow="Identify the document" title="Know exactly what you are responding to." intro={content.issuerContext}>
          <ItemGrid items={content.documentIdentification} icon={<FileText className="h-4 w-4" />} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Read before responding"
          title="What to inspect on the controlling document."
          intro="The document itself should control names, identifiers, stated reasons, response instructions, and any date that matters. Use this checklist to locate the parts that can change the response path."
          tone="soft"
        >
          <NumberedList items={content.inspectOnDocument} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Deadlines & timing"
          title="Verify the clock instead of guessing it."
          intro="Timing rules can change by agency, program, jurisdiction, document type, and procedural posture. Confirm the triggering event and current instructions before relying on a deadline."
        >
          <DetailedList items={content.timingGuidance} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Build the record"
          title="Information and evidence to gather."
          intro="Separate factual information you need to confirm from evidence that supports a disputed point, requested action, or response."
          tone="soft"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <ListCard title="Information to confirm" items={content.informationChecklist} icon={<ClipboardCheck className="h-4 w-4" />} />
            <ListCard title="Evidence checklist" items={content.evidenceChecklist} icon={<FileCheck2 className="h-4 w-4" />} />
          </div>
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Response process"
          title="A workflow-specific path from source document to finished record."
          intro="The exact facts stay yours. These steps define the preparation and review sequence without substituting generic advice for the actual document."
        >
          <ProcessSteps steps={content.processSteps} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Quality control"
          title="Issues to check and mistakes to avoid."
          intro="A useful authority page should help you catch the details that can make a response incomplete, unsupported, misdirected, or difficult to prove later."
          tone="soft"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <ListCard title="Issues & requirements to check" items={content.issuesChecked} icon={<Search className="h-4 w-4" />} />
            <ListCard title="Common mistakes & failure modes" items={content.commonMistakes} icon={<CircleAlert className="h-4 w-4" />} warning />
          </div>
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Representative situations"
          title="How different facts can change the next step."
          intro="These scenarios are examples for orientation, not predictions. Your actual response should be driven by your document, facts, evidence, and current instructions."
        >
          <ScenarioGrid scenarios={content.scenarios} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Possible paths"
          title="More than one response path may be available."
          intro="The purpose of the workflow is to help identify the relevant path without pretending every matter has the same answer."
          tone="soft"
        >
          <DetailedList items={content.responsePaths} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Finished output"
          title="What a complete response or proof packet should contain."
          intro="The contents depend on the controlling instructions, but the final record should make it easy to see what was sent, why it was included, and what evidence supports it."
        >
          <ItemGrid items={content.packetContents} icon={<FileCheck2 className="h-4 w-4" />} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Submission, mailing & proof"
          title="Choose delivery only after you know the rule."
          intro="Mail service, online filing, hand delivery, agency portals, court rules, and contractual notice provisions can create different requirements and different proof. A tracking event is not a substitute for satisfying the controlling submission rule."
          tone="soft"
        >
          <DetailedList items={content.submissionGuidance} />
        </AuthoritySection>

        <AuthoritySection
          eyebrow="Practical tools"
          title="Use a checklist, not memory."
          intro="Keep the practical review steps separate from the substantive response so important administrative details do not disappear at the end."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <ListCard title="Final practical checklist" items={content.practicalChecklist} icon={<Check className="h-4 w-4" />} />
            <ListCard title="Templates & tools that may help" items={content.templatesAndTools} icon={<BookOpen className="h-4 w-4" />} />
          </div>
        </AuthoritySection>

        <SourceSection content={content} />
        <FaqSection content={content} />
        <GlossarySection content={content} />
        <RelatedSection page={page} />

        <section className="border-b border-rule/60 bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55">
                {page.executionHref ? `Available in ${page.product}` : `Continue in ${page.product}`}
              </p>
              <h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
                {page.executionHref ? "Move from guidance into the actual workflow." : "Use the authority guide now. Add execution when the workflow is ready."}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-paper/70">
                {page.executionHref
                  ? "The executable workflow is separately verified from this informational page. You still review the facts, documents, and final packet before any mailing step."
                  : "This page is a complete informational resource even when the software workflow is not yet available. The product directory can route you to currently available tools, and a finished PDF can be mailed separately."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                to={primaryHref}
                className="inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
              >
                {primaryLabel} <ArrowRight className="h-4 w-4" />
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
            <p className="max-w-4xl text-xs leading-6 text-muted-foreground">{content.disclaimer}</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero({ page, primaryHref, primaryLabel }: Props & { primaryHref: string; primaryLabel: string }) {
  const content = page.authority;
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
          <Link to="/">MailMyPDF</Link><span>/</span><Link to={page.productHref}>{page.product}</Link><span>/</span><span aria-current="page">{page.title}</span>
        </nav>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <div className="postmark w-fit">{page.product} · {page.pipeline}</div>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[1.01] sm:text-6xl lg:text-7xl">{content.h1}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-soft sm:text-xl">{content.overview}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primaryHref} className="inline-flex items-center gap-2 rounded-full bg-cobalt px-6 py-3.5 text-sm font-medium text-white shadow-stamp transition-transform hover:-translate-y-0.5">
                {primaryLabel} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/mail-a-pdf" className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3.5 text-sm font-medium hover:bg-paper-deep">
                Already finished? Mail the PDF
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <span>Primary topic: {content.primaryKeyword}</span>
              <span>Sources reviewed {content.reviewedAt}</span>
            </div>
          </div>
          <aside className="envelope-card overflow-hidden">
            <div className="border-b border-rule bg-paper-deep/40 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Before you act</p>
              <h2 className="mt-1 font-serif text-2xl">Start with the actual document.</h2>
            </div>
            <div>
              {content.inspectOnDocument.slice(0, 4).map((item, index) => (
                <div key={`${index}-${item}`} className="flex gap-3 border-b border-rule/60 px-5 py-4 last:border-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-deep font-mono text-[9px] text-cobalt">{String(index + 1).padStart(2, "0")}</span>
                  <p className="text-sm leading-6">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function TwoColumnIntro({ page }: Props) {
  const content = page.authority;
  return (
    <section className="border-b border-rule/60">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <ListCard title="When this is the right resource" items={content.whenToUse} icon={<Check className="h-4 w-4" />} />
        <ListCard title="When to use a different path" items={content.whenNotToUse} icon={<CircleAlert className="h-4 w-4" />} warning />
      </div>
    </section>
  );
}

function AuthoritySection({ eyebrow, title, intro, tone = "plain", children }: { eyebrow: string; title: string; intro: string; tone?: "plain" | "soft"; children: React.ReactNode }) {
  return (
    <section className={`border-b border-rule/60 ${tone === "soft" ? "bg-paper-deep/20" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cobalt">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{intro}</p>
        </div>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

function ItemGrid({ items, icon }: { items: readonly string[]; icon: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <article key={`${index}-${item}`} className="envelope-card p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-cobalt">{icon}</span>
            <p className="text-sm leading-6 text-ink-soft">{item}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function NumberedList({ items }: { items: readonly string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${index}-${item}`} className="envelope-card flex gap-4 p-5">
          <span className="font-mono text-xs text-cobalt">{String(index + 1).padStart(2, "0")}</span>
          <p className="text-sm leading-7 text-ink-soft">{item}</p>
        </div>
      ))}
    </div>
  );
}

function DetailedList({ items }: { items: readonly string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${index}-${item}`} className="envelope-card flex gap-4 p-5 sm:p-6">
          <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-deep text-cobalt"><Check className="h-3.5 w-3.5" /></span>
          <p className="text-sm leading-7 text-ink-soft">{item}</p>
        </div>
      ))}
    </div>
  );
}

function ListCard({ title, items, icon, warning = false }: { title: string; items: readonly string[]; icon: React.ReactNode; warning?: boolean }) {
  return (
    <article className="envelope-card p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${warning ? "border border-rule text-muted-foreground" : "bg-paper-deep text-cobalt"}`}>{icon}</span>
        <h3 className="font-serif text-2xl">{title}</h3>
      </div>
      <ul className="mt-5 space-y-4">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-7 text-ink-soft">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ProcessSteps({ steps }: { steps: WorkflowSeoAuthorityContent["processSteps"] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {steps.map((step, index) => (
        <article key={`${index}-${step.title}`} className="envelope-card p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step {String(index + 1).padStart(2, "0")}</span>
          <h3 className="mt-3 font-serif text-xl">{step.title}</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.guidance}</p>
        </article>
      ))}
    </div>
  );
}

function ScenarioGrid({ scenarios }: { scenarios: WorkflowSeoAuthorityContent["scenarios"] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {scenarios.map((scenario, index) => (
        <article key={`${index}-${scenario.title}`} className="envelope-card p-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cobalt">Scenario {index + 1}</p>
          <h3 className="mt-2 font-serif text-2xl">{scenario.title}</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{scenario.situation}</p>
          <div className="mt-5 border-t border-rule/60 pt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Potential response path</p>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{scenario.responsePath}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function SourceSection({ content }: { content: WorkflowSeoAuthorityContent }) {
  return (
    <AuthoritySection
      eyebrow="Official sources & freshness"
      title="Verify current authority before you rely on it."
      intro={`This page was last reviewed ${content.reviewedAt}. Source review dates show when the linked authority was checked; they do not freeze a rule in time.`}
      tone="soft"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {content.sources.map((source, index) => (
          <a key={`${index}-${source.url}`} href={source.url} target="_blank" rel="noreferrer" className="envelope-card group block p-6 transition-transform hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cobalt">{source.kind} · reviewed {source.reviewedAt}</p>
                <h3 className="mt-2 font-serif text-2xl group-hover:underline">{source.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{source.publisher}</p>
              </div>
              <Link2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>
    </AuthoritySection>
  );
}

function FaqSection({ content }: { content: WorkflowSeoAuthorityContent }) {
  return (
    <AuthoritySection
      eyebrow="Frequently asked questions"
      title="Questions people commonly have before they respond."
      intro="These answers are general guidance. The controlling document and current official instructions should resolve any conflict."
    >
      <div className="divide-y divide-rule/60 border-y border-rule/60">
        {content.faqs.map((faq, index) => (
          <article key={`${index}-${faq.question}`} className="py-6 sm:grid sm:grid-cols-[0.8fr_1.2fr] sm:gap-8">
            <h3 className="font-serif text-xl leading-7">{faq.question}</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:mt-0">{faq.answer}</p>
          </article>
        ))}
      </div>
    </AuthoritySection>
  );
}

function GlossarySection({ content }: { content: WorkflowSeoAuthorityContent }) {
  if (!content.glossary.length) return null;
  return (
    <AuthoritySection
      eyebrow="Glossary"
      title="Terms worth understanding before you act."
      intro="Terminology can carry a specific meaning in an agency, contract, court, or program. Use the controlling source when it defines a term differently."
      tone="soft"
    >
      <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {content.glossary.map((item, index) => (
          <div key={`${index}-${item.term}`} className="envelope-card p-5">
            <dt className="font-serif text-xl">{item.term}</dt>
            <dd className="mt-2 text-sm leading-7 text-muted-foreground">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </AuthoritySection>
  );
}

function RelatedSection({ page }: Props) {
  return (
    <AuthoritySection
      eyebrow="Related workflows"
      title="The next problem is often connected to the first one."
      intro="Use related workflows to move upstream or downstream through the same matter instead of treating every document as an isolated event."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {page.related.map((related, index) => (
          <Link key={`${index}-${related.href}`} to={related.href} className="envelope-card group p-5 transition-transform hover:-translate-y-0.5">
            <p className="font-serif text-xl group-hover:underline">{related.title}</p>
            <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{related.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-cobalt">Open guide <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        ))}
      </div>
    </AuthoritySection>
  );
}
