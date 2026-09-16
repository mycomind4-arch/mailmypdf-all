import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "case-evidence-package",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/case-evidence-package",
  startPath: "/immigration-mail/workflows/case-evidence-package/start",
  title: "Case Evidence Package",
  seoTitle: "Case Evidence Package | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Case Evidence Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Case Evidence Package",
  heroDescription: "Use a guided case evidence package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
