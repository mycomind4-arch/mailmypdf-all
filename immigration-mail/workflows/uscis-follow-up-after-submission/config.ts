import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "uscis-follow-up-after-submission",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/uscis-follow-up-after-submission",
  startPath: "/immigration-mail/workflows/uscis-follow-up-after-submission/start",
  title: "USCIS Follow Up After Submission",
  seoTitle: "USCIS Follow Up After Submission | Immigration Mail | MailMyPDF",
  seoDescription: "Use the USCIS Follow Up After Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "USCIS Follow Up After Submission",
  heroDescription: "Use a guided uscis follow up after submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
