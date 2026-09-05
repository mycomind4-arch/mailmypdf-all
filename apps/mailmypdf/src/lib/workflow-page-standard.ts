import type { WorkflowPublicationState } from "./workflow-seo-catalog";

export const WORKFLOW_AUTHORITY_PAGE_SECTIONS = [
  "Search intent & overview",
  "Document identification",
  "Issuer / agency / domain context",
  "When to use this workflow",
  "When not to use it",
  "What to inspect on the source document",
  "Official rules & sources",
  "Deadlines & timing",
  "Information to confirm",
  "Evidence checklist",
  "Workflow-specific process",
  "Issues & requirements checked",
  "Common mistakes",
  "Realistic scenarios",
  "Possible response paths",
  "Packet / output contents",
  "Submission, mailing, tracking & proof",
  "Practical checklist",
  "Templates & tools",
  "Frequently asked questions",
  "Glossary",
  "Related workflows",
  "Source freshness",
  "Truthful CTA",
] as const;

export type WorkflowAuthoritySection = typeof WORKFLOW_AUTHORITY_PAGE_SECTIONS[number];

/**
 * Lightweight compatibility model for callers that do not need the full
 * WorkflowSeoAuthorityContent contract. Publication state, not the old
 * placeholder/gold labels, controls SEO readiness.
 */
export type WorkflowAuthorityPageModel = {
  workflowId: string;
  title: string;
  description: string;
  canonicalPath: string;
  pipeline: string;
  state: WorkflowPublicationState;
  sources: readonly { title: string; publisher?: string; url: string; reviewedAt?: string }[];
  relatedWorkflowIds: readonly string[];
  disclaimer: string;
};

export function emptyWorkflowAuthorityPage(
  workflowId: string,
  title: string,
  canonicalPath: string,
  pipeline: string,
): WorkflowAuthorityPageModel {
  return {
    workflowId,
    title,
    description: "",
    canonicalPath,
    pipeline,
    state: "DRAFT",
    sources: [],
    relatedWorkflowIds: [],
    disclaimer:
      "This workflow page is part of the MailMyPDF ecosystem. No unfinished capability should be represented as executable, and incomplete authority content must remain non-indexable.",
  };
}
