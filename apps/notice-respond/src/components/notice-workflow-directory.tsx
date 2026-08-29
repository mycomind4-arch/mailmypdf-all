import { Link } from "@tanstack/react-router";
import { noticeRespondCatalog } from "@/domain/workflow-catalog";
import type { MasterWorkflowDefinition } from "@/domain/workflow-definition";
import { SectionHeader } from "@/components/ui-primitives";

export type NoticeWorkflow = {
  slug: string;
  route: string;
  title: string;
  searchIntent: string;
  category: string;
  description: string;
  bestFor: string;
  steps: string[];
  documents: string[];
  lifecycle?: string;
  canonicalPath?: string;
};

/* ── SEO-only entries (no interactive workflow yet) ── */
const SEO_ONLY_WORKFLOWS: NoticeWorkflow[] = [
  {
    slug: "government-notice",
    route: "/respond-to-a-government-notice",
    title: "Respond to a government notice",
    searchIntent: "respond to government notice",
    category: "General government",
    description: "Turn an official notice into a clear response plan: identify what the agency is asking for, the dates that matter, the records you need, and the response you want to send.",
    bestFor: "Official letters, requests for information, compliance notices, and general agency correspondence.",
    steps: ["Upload the notice", "Extract the agency, reference number, dates, and requested action", "Organize supporting documents", "Prepare and review the response", "Mail and keep the proof"],
    documents: ["Notice or letter", "Attachments", "Supporting records", "Prior agency correspondence"],
  },
  {
    slug: "tax-notice",
    route: "/workflows/respond-to-a-tax-notice",
    title: "Respond to a tax notice",
    searchIntent: "respond to tax notice",
    category: "Tax notices",
    description: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence.",
    bestFor: "Federal, state, or local tax notices that require clarification, documents, disagreement, or another written action.",
    steps: ["Upload the notice", "Record the stated reason and deadline", "Collect the records that address the notice", "Draft a point-by-point response", "Review the mailing details"],
    documents: ["Tax notice", "Returns or schedules", "Payment evidence", "Prior correspondence"],
  },
  {
    slug: "code-enforcement",
    route: "/workflows/respond-to-code-enforcement-notice",
    title: "Respond to a code enforcement notice",
    searchIntent: "respond to code enforcement notice",
    category: "Property & local government",
    description: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.",
    bestFor: "Property owners and occupants dealing with municipal code, nuisance, inspection, or compliance notices.",
    steps: ["Upload the notice", "Capture property and case details", "Build the notice timeline", "Attach permits, photos, records, or other evidence", "Prepare a response for review"],
    documents: ["Violation notice", "Inspection reports", "Permits", "Photos", "Property records", "Agency correspondence"],
  },
  {
    slug: "permit-correction",
    route: "/workflows/respond-to-a-permit-correction-notice",
    title: "Respond to a permit correction notice",
    searchIntent: "respond to permit correction notice",
    category: "Property & local government",
    description: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported.",
    bestFor: "Building, planning, zoning, inspection, and permit resubmission comments.",
    steps: ["Upload the correction notice", "Extract each correction item", "Match each item to supporting plans or documents", "Draft a point-by-point response", "Prepare the resubmission package"],
    documents: ["Correction notice", "Plans", "Permit application", "Inspection notes", "Supporting correspondence"],
  },
  {
    slug: "dmv-notice",
    route: "/workflows/respond-to-a-dmv-notice",
    title: "Respond to a DMV notice",
    searchIntent: "respond to DMV notice",
    category: "State agencies",
    description: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response.",
    bestFor: "License, registration, title, suspension, compliance, or other DMV correspondence.",
    steps: ["Upload the notice", "Identify the action and deadline", "Collect records that support your position", "Prepare the response", "Keep the submission and mailing record"],
    documents: ["DMV notice", "License or registration records", "Proof of insurance", "Supporting correspondence"],
  },
  {
    slug: "ssa-notice",
    route: "/workflows/respond-to-an-ssa-notice",
    title: "Respond to an SSA notice",
    searchIntent: "respond to SSA notice",
    category: "Benefits & identity",
    description: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step.",
    bestFor: "Social Security notices, requests for information, and administrative decisions that require action.",
    steps: ["Upload the notice", "Record the notice date and response deadline", "Extract the stated reason or request", "Organize supporting evidence", "Prepare and review the response"],
    documents: ["SSA notice", "Benefit records", "Work or identity records when relevant", "Prior correspondence"],
  },
  {
    slug: "uscis-notice",
    route: "/workflows/respond-to-a-uscis-notice",
    title: "Respond to a USCIS notice",
    searchIntent: "respond to USCIS notice",
    category: "Immigration",
    description: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow.",
    bestFor: "Requests for Evidence, notices of intent, case correspondence, and other USCIS notices that require a response.",
    steps: ["Upload the notice", "Capture receipt/reference information", "Identify the exact request", "Organize evidence and supporting documents", "Review the response package before submission"],
    documents: ["USCIS notice", "Forms and filing copies", "Identity or status records", "Supporting evidence"],
  },
  {
    slug: "benefits-notice",
    route: "/workflows/respond-to-a-benefits-notice",
    title: "Respond to a benefits notice",
    searchIntent: "respond to benefits notice",
    category: "Benefits & identity",
    description: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records.",
    bestFor: "Public benefits, eligibility, overpayment, review, and program-administration notices.",
    steps: ["Upload the notice", "Capture the decision and deadline", "Organize records for each issue", "Draft the response or review request", "Keep proof of what was submitted"],
    documents: ["Benefits notice", "Eligibility records", "Payment statements", "Supporting correspondence"],
  },
];

function catalogToDirectoryEntry(def: MasterWorkflowDefinition): NoticeWorkflow | null {
  if (!def.directory) return null;
  return {
    slug: def.id,
    route: def.directory.seoRoute ?? def.searchIntent.canonicalPath,
    title: def.directory.seoTitle ?? def.title,
    searchIntent: def.searchIntent.primary,
    category: def.directory.category,
    description: def.directory.seoDescription ?? def.description,
    bestFor: def.directory.bestFor,
    steps: def.directory.steps,
    documents: def.directory.documents,
    lifecycle: def.lifecycle,
    canonicalPath: def.searchIntent.canonicalPath,
  };
}

function buildWorkflowList(): NoticeWorkflow[] {
  const entries: NoticeWorkflow[] = [];
  const seenSlugs = new Set<string>();

  for (const def of noticeRespondCatalog) {
    const entry = catalogToDirectoryEntry(def);
    if (entry) {
      entries.push(entry);
      seenSlugs.add(entry.slug);
    }
  }

  for (const entry of SEO_ONLY_WORKFLOWS) {
    if (!seenSlugs.has(entry.slug)) {
      entries.push(entry);
    }
  }

  return entries;
}

export const NOTICE_WORKFLOWS: NoticeWorkflow[] = buildWorkflowList();

export function workflowCategories() {
  const groups = new Map<string, NoticeWorkflow[]>();
  for (const workflow of NOTICE_WORKFLOWS) {
    const current = groups.get(workflow.category) ?? [];
    current.push(workflow);
    groups.set(workflow.category, current);
  }
  return Array.from(groups.entries()).map(([category, workflows]) => ({ category, workflows }));
}

export function WorkflowCard({ workflow }: { workflow: NoticeWorkflow }) {
  return (
    <Link
      to={workflow.route}
      className="group flex h-full flex-col rounded-xl border border-rule bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-premium"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {workflow.category}
        </span>
        <span className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
      <h3 className="mt-4 font-serif text-2xl leading-tight">{workflow.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{workflow.description}</p>
      <div className="mt-4 border-t border-rule/60 pt-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Best for</div>
        <p className="mt-1.5 text-xs leading-5 text-ink-soft">{workflow.bestFor}</p>
      </div>
    </Link>
  );
}

export function WorkflowPage({ workflow }: { workflow: NoticeWorkflow }) {
  return (
    <div className="min-h-screen">
      <main>
        <section className="border-b border-rule/60 bg-paper-deep/20">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
            <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              ← All Notice Respond workflows
            </Link>
            <div className="mt-8 max-w-3xl">
              <div className="postmark w-fit">{workflow.category}</div>
              <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">{workflow.title}</h1>
              <p className="mt-5 text-base leading-7 text-ink-soft sm:text-lg">{workflow.description}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {workflow.canonicalPath && (
                  <Link to={workflow.canonicalPath} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                    Start this workflow →
                  </Link>
                )}
                <Link to="/dashboard" className="rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink/30">
                  Dashboard
                </Link>
                <Link to="/workflows/analyze" className="rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink/30">
                  Analyze a notice
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-20 md:grid-cols-[1.2fr_.8fr]">
            <div>
              <SectionHeader eyebrow="Workflow" title="What happens here" />
              <div className="mt-6 space-y-3">
                {workflow.steps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-xl border border-rule bg-card p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep font-mono text-xs text-stamp">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="pt-1 text-sm leading-6 text-foreground">{step}</div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-6 text-muted-foreground">{workflow.bestFor}</p>
            </div>
            <aside className="rounded-xl border border-rule bg-card p-6 sm:p-7">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Bring these documents</div>
              <ul className="mt-4 space-y-3">
                {workflow.documents.map((document) => (
                  <li key={document} className="flex gap-3 text-sm leading-6">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-stamp" />
                    <span>{document}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7 border-t border-rule/60 pt-6">
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">What the system tracks</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Notice date, response deadline, reference number, agency instructions, supporting documents, response status, and mailing/proof records.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-y border-rule/60 bg-paper-deep/30">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
            <div className="postmark mx-auto w-fit">Ready when you are</div>
            <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Start with the document you received.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Notice Respond helps organize the notice and response process. It is not a law firm and does not provide legal advice.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {workflow.canonicalPath && (
                <Link to={workflow.canonicalPath} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper shadow-card transition-transform hover:-translate-y-0.5">
                  Start this workflow →
                </Link>
              )}
              <Link to="/dashboard" className="inline-flex rounded-full border border-rule px-6 py-3 text-sm font-medium transition-colors hover:border-ink/30">
                Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export function WorkflowHead({ workflow }: { workflow: NoticeWorkflow }) {
  return {
    meta: [
      { title: `${workflow.title} | Notice Respond` },
      { name: "description", content: `${workflow.description} Organize documents, deadlines, and the written response in one workflow.` },
      { property: "og:title", content: `${workflow.title} | Notice Respond` },
      { property: "og:description", content: workflow.description },
      { property: "og:type", content: "website" },
    ],
  };
}

export function WorkflowStructuredData({ workflow }: { workflow: NoticeWorkflow }) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: workflow.title,
    description: workflow.description,
    about: workflow.searchIntent,
    isPartOf: { "@type": "WebSite", name: "Notice Respond" },
  };
  if (workflow.canonicalPath) {
    data["potentialAction"] = {
      "@type": "Action",
      name: "Start workflow",
      target: workflow.canonicalPath,
    };
  }
  return { type: "application/ld+json", children: JSON.stringify(data) };
}
