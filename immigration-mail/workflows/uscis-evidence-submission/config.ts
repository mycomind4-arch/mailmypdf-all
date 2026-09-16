import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "uscis-evidence-submission",
  sectionId: "immigration-mail",
  sectionName: "Immigration Mail",
  sectionPath: "/immigration-mail",
  path: "/immigration-mail/workflows/uscis-evidence-submission",
  startPath: "/immigration-mail/workflows/uscis-evidence-submission/start",
  title: "USCIS Evidence Submission",
  seoTitle: "USCIS Evidence Submission | Immigration Mail | MailMyPDF",
  seoDescription: "Use the USCIS Evidence Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Immigration Mail workflow",
  heroTitle: "USCIS Evidence Submission",
  heroDescription: "Use a guided uscis evidence submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
