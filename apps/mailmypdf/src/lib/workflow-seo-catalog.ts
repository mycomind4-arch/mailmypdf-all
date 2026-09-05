export type WorkflowPublicationState = "DRAFT" | "SEO_READY" | "EXECUTABLE";

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
  content?: WorkflowSeoAuthorityContent;
  execution?: {
    /** Canonical authenticated execution entry point. */
    href: string;
    /** Must be explicitly verified before an EXECUTABLE CTA can render. */
    verified: boolean;
  };
};

/**
 * MASTER PUBLIC SEO CATALOG.
 *
 * This is intentionally separate from WORKFLOW_INVENTORY.json. The old inventory
 * describes the smaller set of workflows already modeled in code; it is not the
 * source of truth for the planned public acquisition surface.
 *
 * Spec-defined workflows should be added here as DRAFT first. DRAFT entries can
 * have routes and relationships without being indexable. Only records carrying
 * the complete authority content contract may be promoted to SEO_READY. A record
 * may become EXECUTABLE only when its execution entry point is separately verified.
 *
 * The project specs are the source for the planned ~330 workflow nodes. Do not
 * invent missing workflows or bulk-fill generic prose just to increase this list.
 */
export const SEO_WORKFLOW_CATALOG: readonly WorkflowSeoCatalogEntry[] = [];

export function defineWorkflowSeoEntry<T extends WorkflowSeoCatalogEntry>(entry: T): T {
  return entry;
}
