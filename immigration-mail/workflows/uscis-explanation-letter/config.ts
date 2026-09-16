import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "uscis-explanation-letter",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/uscis-explanation-letter",
  startPath: "/immigration-mail/workflows/uscis-explanation-letter/start",
  title: "USCIS Explanation Letter",
  seoTitle: "USCIS Explanation Letter | Immigration Mail | MailMyPDF",
  seoDescription: "Use the USCIS Explanation Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "USCIS Explanation Letter",
  heroDescription: "Use a guided uscis explanation letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
