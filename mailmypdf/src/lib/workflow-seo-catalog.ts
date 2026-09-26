import { WORKFLOW_REGISTRY, workflowById } from "./workflow-registry";
import { AUTHORED_SEO_ENTRIES } from "./workflow-seo-entries";

export type WorkflowPublicationState = "DRAFT" | "SEO_READY" | "EXECUTABLE";
export type WorkflowAuthorityReviewStatus = "NEEDS_INDIVIDUAL_REVIEW" | "AUTHORITY_REVIEWED";
export type WorkflowSeoProvenanceKind =
  | "canonical-registry"
  | "modeled-inventory"
  | "build-spec"
  | "manual-review";

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
  /** Canonical workflow id: section/slug. */
  id: string;
  /** Compatibility field; now always contains the canonical section id. */
  vertical: string;
  /** Canonical public workflow route. */
  route: string;
  state: WorkflowPublicationState;
  reviewStatus?: WorkflowAuthorityReviewStatus;
  provenance?: readonly WorkflowSeoProvenance[];
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
 * Workflow identity and route ownership now come from WORKFLOW_REGISTRY, not
 * WORKFLOW_INVENTORY.json. Every canonical workflow begins as DRAFT/noindex.
 * Individually authored authority content can promote that identity to
 * SEO_READY, and only a separately verified execution target can promote it to
 * EXECUTABLE.
 *
 * Legacy inventory remains migration input only. It may not invent public
 * routes, override canonical workflow identity, or confer publication status.
 */
const AUTHORED_BY_ID = new Map(AUTHORED_SEO_ENTRIES.map((entry) => [entry.id, entry]));
if (AUTHORED_BY_ID.size !== AUTHORED_SEO_ENTRIES.length) {
  throw new Error("Duplicate authored workflow authority identity.");
}

for (const authored of AUTHORED_SEO_ENTRIES) {
  const workflow = workflowById(authored.id);
  if (!workflow) {
    throw new Error(
      `Authored SEO entry '${authored.id}' does not resolve to a canonical workflow identity.`,
    );
  }
  if (!workflow.authority || workflow.authority.reviewedAt !== authored.content.reviewedAt) {
    throw new Error(`Authority review metadata drift for '${authored.id}'.`);
  }
  if (authored.execution && (authored.execution.href !== workflow.executionHref ||
      authored.execution.verified !== Boolean(workflow.execution?.verified))) {
    throw new Error(`Authority execution metadata must come from the registry for '${authored.id}'.`);
  }
}

const REGISTRY_PROVENANCE: WorkflowSeoProvenance = {
  kind: "canonical-registry",
  sourcePath: "packages/workflows/src/canonical-workflows.json",
  note: "Canonical workflow identity, review metadata and execution bindings are owned by the shared registry.",
};

export const SEO_WORKFLOW_CATALOG: readonly WorkflowSeoCatalogEntry[] =
  WORKFLOW_REGISTRY.map((workflow) => {
    const authored = AUTHORED_BY_ID.get(workflow.id);
    if (workflow.authority && !authored) {
      throw new Error(`Missing authored authority content for '${workflow.id}'.`);
    }
    if (!authored) {
      return {
        id: workflow.id,
        vertical: workflow.sectionId,
        route: workflow.publicHref,
        state: "DRAFT",
        reviewStatus: "NEEDS_INDIVIDUAL_REVIEW",
        provenance: [REGISTRY_PROVENANCE],
      };
    }

    return {
      id: workflow.id,
      vertical: workflow.sectionId,
      route: workflow.publicHref,
      state: workflow.execution?.verified ? "EXECUTABLE" : "SEO_READY",
      reviewStatus: "AUTHORITY_REVIEWED",
      provenance: [
        REGISTRY_PROVENANCE,
        {
          kind: "manual-review",
          sourcePath: `mailmypdf/src/lib/workflow-seo-entries/${workflow.authority!.module}.ts`,
          note: "Authority content authored and individually reviewed against the Authority Gate contract.",
        },
      ],
      content: authored.content,
      execution: workflow.executionHref ? {
        href: workflow.executionHref,
        verified: Boolean(workflow.execution?.verified),
      } : undefined,
    };
  });

export function defineWorkflowSeoEntry<T extends WorkflowSeoCatalogEntry>(entry: T): T {
  return entry;
}
