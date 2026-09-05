import inventory from "../../WORKFLOW_INVENTORY.json";
import { WORKFLOW_GOLD_CONTENT, type WorkflowGoldContent } from "@/lib/workflow-gold-content";

export type WorkflowAuthoritySource = {
  title: string;
  publisher: string;
  url: string;
  reviewedAt: string;
};

export type WorkflowAuthorityRelated = {
  title: string;
  href: string;
  description: string;
};

export type WorkflowAuthorityFAQ = {
  question: string;
  answer: string;
};

export type WorkflowAuthorityPageData = {
  id: string;
  vertical: string;
  path: string;
  product: string;
  productHref: string;
  pipeline: string;
  title: string;
  description: string;
  overview: string;
  whenToUse: string[];
  whenNotToUse: string[];
  checklist: string[];
  faqQuestions: string[];
  faqPairs: WorkflowAuthorityFAQ[];
  sources: WorkflowAuthoritySource[];
  related: WorkflowAuthorityRelated[];
  reviewedAt: string | null;
  indexable: boolean;
};

type InventoryWorkflow = {
  id: string;
  vertical: string;
  route: string;
  maturity?: string;
  hasGoldContent?: boolean;
  hasApiEndpoint?: boolean;
  sourceVerified?: boolean;
  testStatus?: string;
  lastReviewed?: string | null;
};

type ProductConfig = {
  product: string;
  href: string;
  pipeline: string;
  noun: string;
};

const PRODUCT_BY_VERTICAL: Record<string, ProductConfig> = {
  mail: { product: "MailMyPDF", href: "/mail-a-pdf", pipeline: "Core mailing", noun: "mailing workflow" },
  appeal: { product: "Appeal Mail", href: "/appeal-reply", pipeline: "Appeal & reconsideration", noun: "appeal workflow" },
  notice: { product: "Notice Respond", href: "/notice-response", pipeline: "Official notice response", noun: "notice response workflow" },
  immigration: { product: "Immigration Mail", href: "/immigration", pipeline: "Immigration correspondence", noun: "immigration correspondence workflow" },
  dispute: { product: "Dispute Mail", href: "/dispute-mail", pipeline: "Documented dispute", noun: "dispute workflow" },
  business: { product: "Small Business Mail", href: "/small-business-mail", pipeline: "Business correspondence", noun: "business correspondence workflow" },
  records: { product: "Records Requests", href: "/records-request", pipeline: "Records & information request", noun: "records request workflow" },
  tenant: { product: "Tenant Reply", href: "/tenant-reply", pipeline: "Tenant correspondence", noun: "tenant response workflow" },
  permit: { product: "Permit Reply", href: "/permit-reply", pipeline: "Permit & regulatory response", noun: "permit response workflow" },
  benefits: { product: "Benefits Appeal", href: "/benefits-appeal", pipeline: "Benefits review & appeal", noun: "benefits appeal workflow" },
  claim: { product: "Claim Proof", href: "/claim-proof", pipeline: "Claim evidence & proof", noun: "claim documentation workflow" },
};

const WORKFLOWS = (inventory.workflows ?? []) as InventoryWorkflow[];

function normalizePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

function titleFromSlug(slug: string): string {
  const acronyms: Record<string, string> = {
    cp14: "CP14",
    cp2000: "CP2000",
    foia: "FOIA",
    irs: "IRS",
    uscis: "USCIS",
    ssa: "SSA",
    dmv: "DMV",
    rfe: "RFE",
    noid: "NOID",
    pdf: "PDF",
    ada: "ADA",
  };
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => acronyms[word.toLowerCase()] ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function workflowSlug(entry: InventoryWorkflow): string {
  return entry.id.split("/").filter(Boolean).at(-1) ?? entry.id;
}

function goldFor(entry: InventoryWorkflow): WorkflowGoldContent | undefined {
  return WORKFLOW_GOLD_CONTENT[entry.id];
}

function faqPairs(items: string[]): WorkflowAuthorityFAQ[] {
  const pairs: WorkflowAuthorityFAQ[] = [];
  for (let index = 0; index + 1 < items.length; index += 2) {
    const question = items[index]?.trim() ?? "";
    const answer = items[index + 1]?.trim() ?? "";
    if (question.endsWith("?") && answer && !answer.endsWith("?")) {
      pairs.push({ question, answer });
    }
  }
  return pairs;
}

function reviewedAt(gold: WorkflowGoldContent | undefined): string | null {
  if (!gold?.officialSources.length) return null;
  return [...gold.officialSources]
    .map((source) => source.reviewedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function relatedFor(entry: InventoryWorkflow, count = 4): WorkflowAuthorityRelated[] {
  const sameVertical = WORKFLOWS.filter((candidate) => candidate.vertical === entry.vertical && candidate.id !== entry.id);
  if (!sameVertical.length) return [];
  const currentIndex = Math.max(0, WORKFLOWS.findIndex((candidate) => candidate.id === entry.id));
  const start = currentIndex % sameVertical.length;
  const related: WorkflowAuthorityRelated[] = [];
  for (let offset = 0; offset < Math.min(count, sameVertical.length); offset += 1) {
    const candidate = sameVertical[(start + offset) % sameVertical.length];
    if (!candidate) continue;
    const candidateGold = goldFor(candidate);
    related.push({
      title: titleFromSlug(workflowSlug(candidate)),
      href: normalizePath(candidate.route),
      description:
        candidateGold?.overview ??
        `Learn what to gather, verify, prepare, and preserve for this ${PRODUCT_BY_VERTICAL[candidate.vertical]?.noun ?? "document workflow"}.`,
    });
  }
  return related;
}

export function workflowAuthorityForPath(path: string): WorkflowAuthorityPageData | null {
  const normalized = normalizePath(path);
  const entry = WORKFLOWS.find((candidate) => normalizePath(candidate.route) === normalized);
  if (!entry) return null;

  const product = PRODUCT_BY_VERTICAL[entry.vertical];
  if (!product) return null;

  const gold = goldFor(entry);
  const title = titleFromSlug(workflowSlug(entry));
  const overview =
    gold?.overview ??
    `A focused ${product.noun} for organizing the source documents, facts, supporting material, review steps, and mailing record for ${title.toLowerCase()}.`;

  return {
    id: entry.id,
    vertical: entry.vertical,
    path: normalized,
    product: product.product,
    productHref: product.href,
    pipeline: product.pipeline,
    title,
    description: overview,
    overview,
    whenToUse: gold?.whenToUse ?? [
      `You need to understand what ${title.toLowerCase()} requires before preparing correspondence.`,
      "You want the source documents, facts, and supporting material kept together.",
      "You want to review the final document and preserve the available mailing record.",
    ],
    whenNotToUse: gold?.whenNotToUse ?? [
      "The controlling notice, decision, request, or instructions are unavailable.",
      "You need legal representation or a guaranteed outcome.",
      "Completing the task would require inventing facts, rules, requirements, or deadlines.",
    ],
    checklist: gold?.checklist ?? [
      "The source notice, decision, request, agreement, or document",
      "Names, dates, reference numbers, and recipient information exactly as shown",
      "Supporting records that are directly relevant to the requested action",
      "Current instructions for submission, mailing, or filing",
      "A copy of the final approved packet and available mailing proof",
    ],
    faqQuestions: gold?.faq ?? [],
    faqPairs: faqPairs(gold?.faq ?? []),
    sources: (gold?.officialSources ?? []).map((source) => ({ ...source })),
    related: relatedFor(entry),
    reviewedAt: reviewedAt(gold),
    // These are informational authority pages. Executability is deliberately separate.
    indexable: Boolean(gold && gold.overview && gold.checklist.length >= 3),
  };
}

export function workflowAuthorityPages(): WorkflowAuthorityPageData[] {
  return WORKFLOWS.map((entry) => workflowAuthorityForPath(entry.route)).filter(
    (page): page is WorkflowAuthorityPageData => Boolean(page),
  );
}

export function workflowAuthorityCount(): number {
  return workflowAuthorityPages().length;
}
