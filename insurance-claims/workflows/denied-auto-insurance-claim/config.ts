import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "denied-auto-insurance-claim",
  sectionId: "insurance-claims",
  sectionName: "Insurance Claims",
  sectionPath: "/insurance-claims",
  path: "/insurance-claims/workflows/denied-auto-insurance-claim",
  startPath: "/insurance-claims/workflows/denied-auto-insurance-claim/start",
  title: "Denied Auto Insurance Claim",
  seoTitle: "Denied Auto Insurance Claim | Insurance Claims | MailMyPDF",
  seoDescription: "Use the Denied Auto Insurance Claim workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Insurance Claims workflow",
  heroTitle: "Denied Auto Insurance Claim",
  heroDescription: "Use a guided denied auto insurance claim workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
