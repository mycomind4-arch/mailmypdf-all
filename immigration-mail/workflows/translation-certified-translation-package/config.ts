import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "translation-certified-translation-package",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/translation-certified-translation-package",
  startPath: "/immigration-mail/workflows/translation-certified-translation-package/start",
  title: "Translation Certified Translation Package",
  seoTitle: "Translation Certified Translation Package | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Translation Certified Translation Package workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Translation Certified Translation Package",
  heroDescription: "Use a guided translation certified translation package workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
