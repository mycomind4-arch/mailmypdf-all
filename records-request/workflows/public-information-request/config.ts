import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "public-information-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/public-information-request",
  startPath: "/records-request/workflows/public-information-request/start",
  title: "Public Information Request",
  seoTitle: "Public Information Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Public Information Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Public Information Request",
  heroDescription: "Use a guided public information request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
