import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "benefits-supporting-document-submission",
  sectionId: "benefits-appeal",
  sectionName: "Benefits Appeal",
  sectionPath: "/benefits-appeal",
  path: "/benefits-appeal/workflows/benefits-supporting-document-submission",
  startPath: "/benefits-appeal/workflows/benefits-supporting-document-submission/start",
  title: "Benefits Supporting Document Submission",
  seoTitle: "Benefits Supporting Document Submission | Benefits Appeal | MailMyPDF",
  seoDescription: "Use the Benefits Supporting Document Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Benefits Appeal workflow",
  heroTitle: "Benefits Supporting Document Submission",
  heroDescription: "Use a guided benefits supporting document submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
