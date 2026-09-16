import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "insurance-certificate-request",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/insurance-certificate-request",
  startPath: "/small-business/workflows/insurance-certificate-request/start",
  title: "Insurance Certificate Request",
  seoTitle: "Insurance Certificate Request | Small Business | MailMyPDF",
  seoDescription: "Use the Insurance Certificate Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Insurance Certificate Request",
  heroDescription: "Use a guided insurance certificate request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
