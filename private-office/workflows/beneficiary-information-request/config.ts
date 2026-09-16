import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "beneficiary-information-request",
  sectionId: "private-office",
  sectionName: "Private Office",
  sectionPath: "/private-office",
  path: "/private-office/workflows/beneficiary-information-request",
  startPath: "/private-office/workflows/beneficiary-information-request/start",
  title: "Beneficiary Information Request",
  seoTitle: "Beneficiary Information Request | Private Office | MailMyPDF",
  seoDescription: "Use the Beneficiary Information Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Private Office workflow",
  heroTitle: "Beneficiary Information Request",
  heroDescription: "Use a guided beneficiary information request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
