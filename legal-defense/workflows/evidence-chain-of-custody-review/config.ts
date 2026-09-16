import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "evidence-chain-of-custody-review",
  sectionId: "legal-defense",
  sectionName: "Legal Defense",
  sectionPath: "/legal-defense",
  path: "/legal-defense/workflows/evidence-chain-of-custody-review",
  startPath: "/legal-defense/workflows/evidence-chain-of-custody-review/start",
  title: "Evidence Chain Of Custody Review",
  seoTitle: "Evidence Chain Of Custody Review | Legal Defense | MailMyPDF",
  seoDescription: "Use the Evidence Chain Of Custody Review workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Legal Defense workflow",
  heroTitle: "Evidence Chain Of Custody Review",
  heroDescription: "Use a guided evidence chain of custody review workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
