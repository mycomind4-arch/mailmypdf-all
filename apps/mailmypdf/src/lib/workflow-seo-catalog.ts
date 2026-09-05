import inventory from "../../WORKFLOW_INVENTORY.json";

export type WorkflowPublicationState = "DRAFT" | "SEO_READY" | "EXECUTABLE";
export type WorkflowAuthorityReviewStatus = "NEEDS_INDIVIDUAL_REVIEW" | "AUTHORITY_REVIEWED";
export type WorkflowSeoProvenanceKind = "modeled-inventory" | "build-spec" | "manual-review";

export type WorkflowSeoProvenance = {
  kind: WorkflowSeoProvenanceKind;
  sourcePath: string;
  note: string;
};

export type WorkflowAuthoritySourceKind =
  | "official"
  | "primary"
  | "regulator"
  | "reputable-secondary";

export type WorkflowAuthoritySource = {
  title: string;
  publisher: string;
  url: string;
  reviewedAt: string;
  kind: WorkflowAuthoritySourceKind;
};

export type WorkflowAuthorityFAQ = {
  question: string;
  answer: string;
};

export type WorkflowAuthorityProcessStep = {
  title: string;
  guidance: string;
};

export type WorkflowAuthorityScenario = {
  title: string;
  situation: string;
  responsePath: string;
};

export type WorkflowAuthorityGlossaryItem = {
  term: string;
  definition: string;
};

/**
 * Substantive content contract for an indexable MailMyPDF workflow authority page.
 *
 * Shared layout belongs in components. The information below must remain specific
 * to the workflow. A page may not become SEO_READY merely because a route exists.
 */
export type WorkflowSeoAuthorityContent = {
  primaryKeyword: string;
  primaryIntent: string;
  secondaryKeywords: readonly string[];
  seoTitle: string;
  h1: string;
  metaDescription: string;
  overview: string;
  documentIdentification: readonly string[];
  issuerContext: string;
  whenToUse: readonly string[];
  whenNotToUse: readonly string[];
  inspectOnDocument: readonly string[];
  timingGuidance: readonly string[];
  informationChecklist: readonly string[];
  evidenceChecklist: readonly string[];
  processSteps: readonly WorkflowAuthorityProcessStep[];
  issuesChecked: readonly string[];
  commonMistakes: readonly string[];
  scenarios: readonly WorkflowAuthorityScenario[];
  responsePaths: readonly string[];
  packetContents: readonly string[];
  submissionGuidance: readonly string[];
  practicalChecklist: readonly string[];
  templatesAndTools: readonly string[];
  faqs: readonly WorkflowAuthorityFAQ[];
  glossary: readonly WorkflowAuthorityGlossaryItem[];
  sources: readonly WorkflowAuthoritySource[];
  relatedWorkflowIds: readonly string[];
  reviewedAt: string;
  disclaimer: string;
};

export type WorkflowSeoCatalogEntry = {
  id: string;
  vertical: string;
  route: string;
  state: WorkflowPublicationState;
  /**
   * DRAFT inventory/spec extraction is never equivalent to an authority review.
   * Promotion requires a deliberate individual workflow review.
   */
  reviewStatus: WorkflowAuthorityReviewStatus;
  provenance: readonly WorkflowSeoProvenance[];
  content?: WorkflowSeoAuthorityContent;
  execution?: {
    /** Canonical authenticated execution entry point. */
    href: string;
    /** Must be explicitly verified before an EXECUTABLE CTA can render. */
    verified: boolean;
  };
};

type InventoryWorkflow = {
  id: string;
  vertical: string;
  route: string;
};

/**
 * MASTER PUBLIC SEO CATALOG.
 *
 * The existing WORKFLOW_INVENTORY is now wired into this catalog only as DRAFT
 * topology. This does NOT endorse the old inventory's content-quality labels.
 * Every seeded record is intentionally NEEDS_INDIVIDUAL_REVIEW and noindex until
 * the workflow itself is reviewed and upgraded to the standard it is supposed to
 * reach.
 *
 * Spec-only concepts live in workflow-seo-candidates.ts until canonical identity
 * and route ownership are resolved. This prevents an incomplete build spec from
 * silently creating an indexable page or stealing an existing route.
 *
 * Only records carrying the complete authority content contract AND an explicit
 * AUTHORITY_REVIEWED status may be promoted to SEO_READY. A record may become
 * EXECUTABLE only when its execution entry point is separately verified.
 *
 * Do not invent missing workflows or bulk-fill generic prose to reach a target
 * count. Extraction, normalization, individual review, authority publication, and
 * executable certification are separate steps.
 */
export const SEO_WORKFLOW_CATALOG: readonly WorkflowSeoCatalogEntry[] = (
  (inventory.workflows ?? []) as InventoryWorkflow[]
).map((workflow) => ({
  id: workflow.id,
  vertical: workflow.vertical,
  route: workflow.route,
  state: "DRAFT",
  reviewStatus: "NEEDS_INDIVIDUAL_REVIEW",
  provenance: [
    {
      kind: "modeled-inventory",
      sourcePath: "apps/mailmypdf/WORKFLOW_INVENTORY.json",
      note: "Imported as topology only; prior maturity/content flags do not constitute authority review.",
    },
  ],
}));

export function defineWorkflowSeoEntry<T extends WorkflowSeoCatalogEntry>(entry: T): T {
  return entry;
}
