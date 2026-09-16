import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "irs-underreporter-notice-response",
  sectionId: "notice-respond",
  sectionName: "Notice Respond",
  sectionPath: "/notice-respond",
  path: "/notice-respond/workflows/irs-underreporter-notice-response",
  startPath: "/notice-respond/workflows/irs-underreporter-notice-response/start",
  title: "IRS Underreporter Notice Response",
  seoTitle: "IRS Underreporter Notice Response | Notice Respond | MailMyPDF",
  seoDescription: "Use the IRS Underreporter Notice Response workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Notice Respond workflow",
  heroTitle: "IRS Underreporter Notice Response",
  heroDescription: "Use a guided irs underreporter notice response workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
