import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "immigration-affidavit-package",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/immigration-affidavit-package",
  startPath: "/immigration-mail/workflows/immigration-affidavit-package/start",
  title: "Immigration Affidavit Package",
  seoTitle: "Immigration Affidavit Package | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Immigration Affidavit Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Immigration Affidavit Package",
  heroDescription: "Use a guided immigration affidavit package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
