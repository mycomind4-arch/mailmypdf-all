import inventory from "../../WORKFLOW_INVENTORY.json";
import { WORKFLOW_GOLD_CONTENT, type WorkflowGoldContent } from "./workflow-gold-content";
import { validateAuthorityRecord, type AuthorityGateResult } from "./workflow-authority-gate";
import {
  SEO_WORKFLOW_CATALOG,
  type WorkflowPublicationState,
  type WorkflowSeoAuthorityContent,
  type WorkflowSeoCatalogEntry,
} from "./workflow-seo-catalog";

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
  seoTitle: string;
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
  publicationState: WorkflowPublicationState;
  authorityScore: number | null;
  authorityGate: AuthorityGateResult | null;
  authority: WorkflowSeoAuthorityContent | null;
  executionHref: string | null;
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

type CombinedWorkflow = {
  id: string;
  vertical: string;
  route: string;
  inventory?: InventoryWorkflow;
  seo?: WorkflowSeoCatalogEntry;
};

type ProductConfig = {
  product: string;
  href: string;
  pipeline: string;
  noun: string;
};

const PRODUCT_BY_VERTICAL: Record<string, ProductConfig> = {
  mail: { product: "MailMyPDF", href: "/mail-a-pdf", pipeline: "Core mailing", noun: "mailing workflow" },
  appeal: { product: "Appeal Mail", href: "/appeal-mail", pipeline: "Appeal & reconsideration", noun: "appeal workflow" },
  notice: { product: "Notice Respond", href: "/notice-respond", pipeline: "Official notice response", noun: "notice response workflow" },
  immigration: { product: "Immigration Mail", href: "/immigration-mail", pipeline: "Immigration correspondence", noun: "immigration correspondence workflow" },
  dispute: { product: "Dispute Mail", href: "/dispute-mail", pipeline: "Documented dispute", noun: "dispute workflow" },
  business: { product: "Small Business", href: "/small-business", pipeline: "Business correspondence", noun: "business correspondence workflow" },
  records: { product: "Records Requests", href: "/records-request", pipeline: "Records & information request", noun: "records request workflow" },
  tenant: { product: "Tenant Reply", href: "/tenant-reply", pipeline: "Tenant correspondence", noun: "tenant response workflow" },
  permit: { product: "Permit Reply", href: "/permit-reply", pipeline: "Permit & regulatory response", noun: "permit response workflow" },
  benefits: { product: "Benefits Appeal", href: "/benefits-appeal", pipeline: "Benefits review & appeal", noun: "benefits appeal workflow" },
  claim: { product: "Claim Proof", href: "/claim-proof", pipeline: "Claim evidence & proof", noun: "claim documentation workflow" },
  "code-enforcement": { product: "Code Enforcement", href: "/code-enforcement", pipeline: "Code enforcement response", noun: "code enforcement workflow" },
  insurance: { product: "Insurance Claims", href: "/insurance-claims", pipeline: "Insurance claim preparation", noun: "insurance claim workflow" },
  "insurance-claims": { product: "Insurance Claims", href: "/insurance-claims", pipeline: "Insurance claim preparation", noun: "insurance claim workflow" },
  "private-office": { product: "Private Office", href: "/private-office", pipeline: "Private document operations", noun: "private office workflow" },
};

const INVENTORY_WORKFLOWS = (inventory.workflows ?? []) as InventoryWorkflow[];
const SEO_BY_ID = new Map(SEO_WORKFLOW_CATALOG.map((entry) => [entry.id, entry] as const));

const WORKFLOWS: CombinedWorkflow[] = [
  ...INVENTORY_WORKFLOWS.map((entry) => ({
    id: entry.id,
    vertical: SEO_BY_ID.get(entry.id)?.vertical ?? entry.vertical,
    route: SEO_BY_ID.get(entry.id)?.route ?? entry.route,
    inventory: entry,
    seo: SEO_BY_ID.get(entry.id),
  })),
  ...SEO_WORKFLOW_CATALOG.filter((entry) => !INVENTORY_WORKFLOWS.some((legacy) => legacy.id === entry.id)).map((entry) => ({
    id: entry.id,
    vertical: entry.vertical,
    route: entry.route,
    seo: entry,
  })),
];

function normalizePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

function titleFromSlug(slug: string): string {
  const acronyms: Record<string, string> = {
    cp14: "CP14",
    cp2000: "CP2000",
    cp504: "CP504",
    cp523: "CP523",
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

function workflowSlug(entry: CombinedWorkflow): string {
  return entry.id.split("/").filter(Boolean).at(-1) ?? entry.id;
}

function goldFor(entry: CombinedWorkflow): WorkflowGoldContent | undefined {
  return WORKFLOW_GOLD_CONTENT[entry.id];
}

function legacyFaqPairs(items: string[]): WorkflowAuthorityFAQ[] {
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

function reviewedAtFromGold(gold: WorkflowGoldContent | undefined): string | null {
  if (!gold?.officialSources.length) return null;
  return [...gold.officialSources]
    .map((source) => source.reviewedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function workflowById(id: string): CombinedWorkflow | undefined {
  return WORKFLOWS.find((candidate) => candidate.id === id);
}

function relatedDescription(candidate: CombinedWorkflow): string {
  const authority = candidate.seo?.content;
  if (authority?.overview) return authority.overview;
  const gold = goldFor(candidate);
  if (gold?.overview) return gold.overview;
  return `Learn what to gather, verify, prepare, and preserve for this ${PRODUCT_BY_VERTICAL[candidate.vertical]?.noun ?? "document workflow"}.`;
}

function relatedFor(entry: CombinedWorkflow, authority: WorkflowSeoAuthorityContent | null, count = 4): WorkflowAuthorityRelated[] {
  if (authority?.relatedWorkflowIds.length) {
    return authority.relatedWorkflowIds
      .map((id) => workflowById(id))
      .filter((candidate): candidate is CombinedWorkflow => Boolean(candidate))
      .slice(0, count)
      .map((candidate) => ({
        title: candidate.seo?.content?.h1 ?? titleFromSlug(workflowSlug(candidate)),
        href: normalizePath(candidate.route),
        description: relatedDescription(candidate),
      }));
  }

  const sameVertical = WORKFLOWS.filter((candidate) => candidate.vertical === entry.vertical && candidate.id !== entry.id);
  if (!sameVertical.length) return [];
  const currentIndex = Math.max(0, WORKFLOWS.findIndex((candidate) => candidate.id === entry.id));
  const start = currentIndex % sameVertical.length;
  const related: WorkflowAuthorityRelated[] = [];
  for (let offset = 0; offset < Math.min(count, sameVertical.length); offset += 1) {
    const candidate = sameVertical[(start + offset) % sameVertical.length];
    if (!candidate) continue;
    related.push({
      title: candidate.seo?.content?.h1 ?? titleFromSlug(workflowSlug(candidate)),
      href: normalizePath(candidate.route),
      description: relatedDescription(candidate),
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
  const seoEntry = entry.seo;
  const authority = seoEntry?.content ?? null;
  const gate = seoEntry ? validateAuthorityRecord(seoEntry) : null;
  const publicationState: WorkflowPublicationState = seoEntry?.state ?? "DRAFT";
  const fallbackTitle = titleFromSlug(workflowSlug(entry));
  const title = authority?.h1 ?? fallbackTitle;
  const overview =
    authority?.overview ??
    gold?.overview ??
    `A focused ${product.noun} for organizing the source documents, facts, supporting material, review steps, and mailing record for ${fallbackTitle.toLowerCase()}.`;

  const faqPairs = authority?.faqs.map((item) => ({ question: item.question, answer: item.answer })) ?? legacyFaqPairs(gold?.faq ?? []);
  const sources = authority?.sources.map(({ title: sourceTitle, publisher, url, reviewedAt }) => ({ title: sourceTitle, publisher, url, reviewedAt })) ??
    (gold?.officialSources ?? []).map((source) => ({ ...source }));

  return {
    id: entry.id,
    vertical: entry.vertical,
    path: normalized,
    product: product.product,
    productHref: product.href,
    pipeline: product.pipeline,
    title,
    seoTitle: authority?.seoTitle ?? `${fallbackTitle} | ${product.product} | MailMyPDF`,
    description: authority?.metaDescription ?? overview,
    overview,
    whenToUse: [...(authority?.whenToUse ?? gold?.whenToUse ?? [
      `You need to understand what ${fallbackTitle.toLowerCase()} requires before preparing correspondence.`,
      "You want the source documents, facts, and supporting material kept together.",
      "You want to review the final document and preserve the available mailing record.",
    ])],
    whenNotToUse: [...(authority?.whenNotToUse ?? gold?.whenNotToUse ?? [
      "The controlling notice, decision, request, or instructions are unavailable.",
      "You need legal representation or a guaranteed outcome.",
      "Completing the task would require inventing facts, rules, requirements, or deadlines.",
    ])],
    checklist: [...(authority?.evidenceChecklist ?? gold?.checklist ?? [
      "The source notice, decision, request, agreement, or document",
      "Names, dates, reference numbers, and recipient information exactly as shown",
      "Supporting records that are directly relevant to the requested action",
      "Current instructions for submission, mailing, or filing",
      "A copy of the final approved packet and available mailing proof",
    ])],
    faqQuestions: authority?.faqs.map((item) => item.question) ?? [...(gold?.faq ?? [])],
    faqPairs,
    sources,
    related: relatedFor(entry, authority),
    reviewedAt: authority?.reviewedAt ?? reviewedAtFromGold(gold),
    publicationState,
    authorityScore: gate?.score ?? null,
    authorityGate: gate,
    authority,
    executionHref:
      publicationState === "EXECUTABLE" && seoEntry?.execution?.verified ? seoEntry.execution.href : null,
    // Publication state is not enough. The page must pass the Authority Gate.
    indexable: Boolean(gate?.eligibleForIndexing),
  };
}

export function workflowAuthorityPages(): WorkflowAuthorityPageData[] {
  return WORKFLOWS.map((entry) => workflowAuthorityForPath(entry.route)).filter(
    (page): page is WorkflowAuthorityPageData => Boolean(page),
  );
}

export function publicWorkflowAuthorityPages(): WorkflowAuthorityPageData[] {
  return workflowAuthorityPages().filter((page) => page.indexable);
}

export function workflowAuthorityCount(): number {
  return workflowAuthorityPages().length;
}

export function workflowAuthorityKnownIds(): ReadonlySet<string> {
  return new Set(WORKFLOWS.map((entry) => entry.id));
}
