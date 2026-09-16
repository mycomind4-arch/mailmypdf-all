import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "claim-evidence-checklist",
  sectionId: "claim-proof",
  sectionName: "Claim Proof",
  sectionPath: "/claim-proof",
  path: "/claim-proof/workflows/claim-evidence-checklist",
  startPath: "/claim-proof/workflows/claim-evidence-checklist/start",
  title: "Claim Evidence Checklist",
  seoTitle: "Claim Evidence Checklist | Claim Proof | MailMyPDF",
  seoDescription: "Use the Claim Evidence Checklist workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Claim Proof workflow",
  heroTitle: "Claim Evidence Checklist",
  heroDescription: "Use a guided claim evidence checklist workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
