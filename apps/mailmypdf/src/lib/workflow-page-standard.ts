export const WORKFLOW_AUTHORITY_PAGE_SECTIONS = [
  "Overview",
  "When to use this workflow",
  "When not to use it",
  "Official rules & sources",
  "Deadlines & timing",
  "Documents to gather",
  "Information to confirm",
  "Evidence checklist",
  "How the workflow works",
  "Issues & requirements checked",
  "Common mistakes",
  "Realistic scenarios",
  "Practical checklists",
  "Templates & tools",
  "Frequently asked questions",
  "Glossary",
  "Related workflows",
  "Start the workflow",
  "Mailing, tracking & proof",
  "Source freshness",
] as const;

export type WorkflowAuthoritySection = typeof WORKFLOW_AUTHORITY_PAGE_SECTIONS[number];

export type WorkflowAuthorityPageModel = {
  workflowId: string;
  title: string;
  description: string;
  canonicalPath: string;
  pipeline: string;
  maturity: "placeholder" | "authority-draft" | "source-verified" | "workflow-wired" | "gold" | "production-verified";
  sources: readonly { title: string; publisher?: string; url: string; reviewedAt?: string }[];
  relatedWorkflowIds: readonly string[];
  disclaimer: string;
};

export function emptyWorkflowAuthorityPage(workflowId: string, title: string, canonicalPath: string, pipeline: string): WorkflowAuthorityPageModel {
  return {
    workflowId,
    title,
    description: "",
    canonicalPath,
    pipeline,
    maturity: "placeholder",
    sources: [],
    relatedWorkflowIds: [],
    disclaimer: "This workflow page is part of the MailMyPDF ecosystem. No unfinished capability should be represented as executable.",
  };
}
