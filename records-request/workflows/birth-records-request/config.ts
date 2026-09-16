import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "birth-records-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/birth-records-request",
  startPath: "/records-request/workflows/birth-records-request/start",
  title: "Birth Records Request",
  seoTitle: "Birth Records Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Birth Records Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Birth Records Request",
  heroDescription: "Use a guided birth records request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
