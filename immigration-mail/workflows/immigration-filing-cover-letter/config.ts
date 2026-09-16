import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "immigration-filing-cover-letter",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/immigration-filing-cover-letter",
  startPath: "/immigration-mail/workflows/immigration-filing-cover-letter/start",
  title: "Immigration Filing Cover Letter",
  seoTitle: "Immigration Filing Cover Letter | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Immigration Filing Cover Letter workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Immigration Filing Cover Letter",
  heroDescription: "Use a guided immigration filing cover letter workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
