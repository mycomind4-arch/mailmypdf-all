import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-identity-information-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-identity-information-notice-response",
  startPath: "/notice-respond/workflows/irs-identity-information-notice-response/start",
  title: "IRS Identity Information Notice Response",
  seoTitle: "IRS Identity Information Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS Identity Information Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS Identity Information Notice Response",
  heroDescription: "Use a guided irs identity information notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
