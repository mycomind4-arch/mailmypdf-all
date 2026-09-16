import type { WorkflowLandingConfig } from "@mailmypdf/design-system"

export const workflowConfig = {
  id: "appeal-out-of-network-denial",
  sectionId: "appeal-mail",
  sectionName: "Appeal Mail",
  sectionPath: "/appeal-mail",
  path: "/appeal-mail/workflows/appeal-out-of-network-denial",
  startPath: "/appeal-mail/workflows/appeal-out-of-network-denial/start",
  title: "Appeal Out Of Network Denial",
  seoTitle: "Appeal Out Of Network Denial | Appeal Mail | MailMyPDF",
  seoDescription: "Use the Appeal Out Of Network Denial workflow to organize the source record, relevant facts, supporting documents, reviewable correspondence, and mailing or proof record.",
  eyebrow: "Appeal Mail workflow",
  heroTitle: "Appeal Out Of Network Denial",
  heroDescription: "Use a guided appeal out of network denial workflow built around the actual documents, facts, dates, evidence, review, and correspondence involved in this situation.",
  indexable: false,
  contentStatus: "scaffold",
} as const satisfies WorkflowLandingConfig

export default workflowConfig
