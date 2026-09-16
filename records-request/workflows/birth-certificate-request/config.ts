import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "birth-certificate-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/birth-certificate-request",
  startPath: "/records-request/workflows/birth-certificate-request/start",
  title: "Birth Certificate Request",
  seoTitle: "Birth Certificate Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Birth Certificate Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Birth Certificate Request",
  heroDescription: "Use a guided birth certificate request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
