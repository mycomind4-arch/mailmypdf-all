import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "records-denial-appeal-request",
  sectionId: "records-request",
  sectionName: "Records Requests",
  sectionPath: "/records-request",
  path: "/records-request/workflows/records-denial-appeal-request",
  startPath: "/records-request/workflows/records-denial-appeal-request/start",
  title: "Records Denial Appeal Request",
  seoTitle: "Records Denial Appeal Request | Records Requests | MailMyPDF",
  seoDescription: "Use the Records Denial Appeal Request workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Records Requests workflow",
  heroTitle: "Records Denial Appeal Request",
  heroDescription: "Use a guided records denial appeal request workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
