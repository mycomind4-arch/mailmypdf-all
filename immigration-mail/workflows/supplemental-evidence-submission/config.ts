import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "supplemental-evidence-submission",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/supplemental-evidence-submission",
  startPath: "/immigration-mail/workflows/supplemental-evidence-submission/start",
  title: "Supplemental Evidence Submission",
  seoTitle: "Supplemental Evidence Submission | Immigration Mail | MailMyPDF",
  seoDescription: "Use the Supplemental Evidence Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "Supplemental Evidence Submission",
  heroDescription: "Use a guided supplemental evidence submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
