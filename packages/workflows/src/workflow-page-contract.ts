export type WorkflowPageMaturity =
  | "placeholder"
  | "authority-draft"
  | "source-verified"
  | "workflow-wired"
  | "gold"
  | "production-verified";

export type AuthoritySectionId =
  | "overview"
  | "when-to-use"
  | "when-not-to-use"
  | "official-sources"
  | "deadlines"
  | "documents"
  | "information"
  | "evidence"
  | "how-it-works"
  | "issues"
  | "requirements"
  | "common-mistakes"
  | "scenarios"
  | "checklists"
  | "templates"
  | "faq"
  | "glossary"
  | "related-workflows"
  | "execution"
  | "mailing-proof"
  | "freshness";

export const WORKFLOW_AUTHORITY_SECTIONS: readonly AuthoritySectionId[] = [
  "overview",
  "when-to-use",
  "when-not-to-use",
  "official-sources",
  "deadlines",
  "documents",
  "information",
  "evidence",
  "how-it-works",
  "issues",
  "requirements",
  "common-mistakes",
  "scenarios",
  "checklists",
  "templates",
  "faq",
  "glossary",
  "related-workflows",
  "execution",
  "mailing-proof",
  "freshness",
] as const;

export interface WorkflowAuthorityPage {
  workflowId: string;
  vertical: string;
  pipeline: string;
  title: string;
  canonicalPath: string;
  primaryIntent: string;
  maturity: WorkflowPageMaturity;
  authoritySections: readonly AuthoritySectionId[];
  officialSources: readonly string[];
  relatedWorkflows: readonly string[];
  sourceLastReviewed?: string;
  contentOwner?: string;
  disclaimer?: string;
}

export function isAuthorityPageReady(page: WorkflowAuthorityPage): boolean {
  return page.authoritySections.length === WORKFLOW_AUTHORITY_SECTIONS.length
    && page.maturity !== "placeholder";
}

export function canClaimSourceVerified(page: WorkflowAuthorityPage): boolean {
  return page.maturity === "source-verified"
    || page.maturity === "workflow-wired"
    || page.maturity === "gold"
    || page.maturity === "production-verified";
}
