import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "permit-document-submission",
  sectionId: "permit-reply",
  sectionName: "Permit Reply",
  sectionPath: "/permit-reply",
  path: "/permit-reply/workflows/permit-document-submission",
  startPath: "/permit-reply/workflows/permit-document-submission/start",
  title: "Permit Document Submission",
  seoTitle: "Permit Document Submission | Permit Reply | MailMyPDF",
  seoDescription: "Use the Permit Document Submission workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Permit Reply workflow",
  heroTitle: "Permit Document Submission",
  heroDescription: "Use a guided permit document submission workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
