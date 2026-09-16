import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "immigration-mailing-proof-package",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/immigration-mailing-proof-package",
  startPath: "/immigration-mail/workflows/immigration-mailing-proof-package/start",
  title: "Immigration Mailing Proof Package",
  seoTitle: "Immigration Mailing Proof Package | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Immigration Mailing Proof Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Immigration Mailing Proof Package",
  heroDescription: "Use a guided immigration mailing proof package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
