import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "customer-complaint-response",
  sectionId: "small-business",
  sectionName: "Small Business",
  sectionPath: "/small-business",
  path: "/small-business/workflows/customer-complaint-response",
  startPath: "/small-business/workflows/customer-complaint-response/start",
  title: "Customer Complaint Response",
  seoTitle: "Customer Complaint Response | Small Business | MailMyPDF",
  seoDescription: "Use the Customer Complaint Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Small Business workflow",
  heroTitle: "Customer Complaint Response",
  heroDescription: "Use a guided customer complaint response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
